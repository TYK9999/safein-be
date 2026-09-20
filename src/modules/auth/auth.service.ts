import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kysely } from 'kysely';

import { APP_DB } from '../../database/db.provider';
import { COMMUNITY_TENANT_ID } from '../../database/schema';
import type { AccountStatus, DB } from '../../database/schema';
import { AppLoggerService } from '../../logging/app-logger.service';
import { JwtService } from './jwt.service';
import { MailerService } from './mailer.service';
import { PermissionsService } from './permissions.service';
import type { UserPermissions } from './permissions';
import {
  generateOtp,
  hashCredential,
  timingSafeEqualHex,
} from './util/crypto.util';

export interface PublicUser {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  emailVerified: boolean;
  accountStatus: AccountStatus;
  role: string;
  isPlatformAdmin: boolean;
  tenant: { id: number; name: string };
  /** Capability object for the React app (nav, landing, can['tasks.create']). */
  permissions: UserPermissions;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

function emailDomain(email: string): string {
  const at = email.lastIndexOf('@');
  return at >= 0 ? email.slice(at + 1).toLowerCase() : 'unknown';
}

/**
 * Passwordless auth (email OTP only):
 *   * Sign-up and invite create account_status = invited.
 *   * First successful OTP verify sets the account active and starts a session.
 *   * Later sign-ins use the same OTP request / verify path.
 */
@Injectable()
export class AuthService {
  private readonly pepper: Buffer;

  constructor(
    @Inject(APP_DB) private readonly db: Kysely<DB>,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly mailer: MailerService,
    private readonly permissions: PermissionsService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(AuthService.name);
    // A process-wide salt for hashing OTP/token values at rest (from env).
    this.pepper = Buffer.from(
      this.config.getOrThrow<string>('otp.hashSecret'),
      'utf8',
    );
  }

  private get otpTtlSec(): number {
    return this.config.getOrThrow<number>('otp.ttlSec');
  }
  private get otpLength(): number {
    return this.config.getOrThrow<number>('otp.length');
  }
  private get otpMaxAttempts(): number {
    return this.config.getOrThrow<number>('otp.maxAttempts');
  }

  // ─── Signup ─────────────────────────────────────────────────────────────────
  async register(
    email: string,
    firstName?: string,
    lastName?: string,
  ): Promise<void> {
    const domain = emailDomain(email);
    this.logger.debug(
      `Register start emailDomain=${domain}`,
      `AuthService.register`,
    );
    const existing = await this.findByEmail(email);
    let userId = existing?.id;
    if (userId === undefined) {
      const created = await this.db
        .insertInto('app_user')
        .values({
          email,
          first_name: firstName,
          last_name: lastName,
          account_status: 'invited',
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      userId = created.id;
      this.logger.info(
        `User created id=${userId} emailDomain=${domain}`,
        `AuthService.register`,
      );
    }
    // Self-registration joins the Community tenant as a member (self-created).
    await this.db
      .insertInto('user_tenant_membership')
      .values({
        user_id: userId,
        tenant_id: COMMUNITY_TENANT_ID,
        role: 'member',
        created_by: userId,
      })
      .onConflict((oc) => oc.columns(['user_id', 'tenant_id']).doNothing())
      .execute();
    this.logger.debug(
      `Membership ensured userId=${userId} tenantId=${COMMUNITY_TENANT_ID}`,
      `AuthService.register`,
    );
    const code = await this.mintOtp(userId);
    this.logger.debug(`OTP minted userId=${userId}`, `AuthService.register`);
    await this.mailer.sendOtp(email, code);
    this.logger.info(
      `Register complete id=${userId} emailDomain=${domain}`,
      `AuthService.register`,
    );
  }

  // ─── Login: OTP ───────────────────────────────────────────────────────────────
  async requestOtp(email: string): Promise<void> {
    const domain = emailDomain(email);
    this.logger.debug(
      `OTP request start emailDomain=${domain}`,
      `AuthService.requestOtp`,
    );
    const user = await this.findByEmail(email);
    if (!user) {
      this.logger.info(
        `OTP request no_account emailDomain=${domain}`,
        `AuthService.requestOtp`,
      );
      return; // no account enumeration
    }
    if (!(await this.canRequestOtp(user.id))) {
      this.logger.info(
        `OTP request blocked userId=${user.id} emailDomain=${domain}`,
        `AuthService.requestOtp`,
      );
      return;
    }
    const code = await this.mintOtp(user.id);
    this.logger.debug(
      `OTP minted userId=${user.id}`,
      `AuthService.requestOtp`,
    );
    await this.mailer.sendOtp(email, code);
    this.logger.info(
      `OTP request success userId=${user.id} emailDomain=${domain}`,
      `AuthService.requestOtp`,
    );
  }

  async verifyOtp(email: string, code: string): Promise<Session> {
    const domain = emailDomain(email);
    this.logger.debug(
      `OTP verify start emailDomain=${domain}`,
      `AuthService.verifyOtp`,
    );
    const user = await this.findByEmail(email);
    if (!user) {
      this.logger.error(
        `verify_otp_failure reason=unknown_user emailDomain=${domain}`,
        `AuthService.verifyOtp`,
      );
      throw new UnauthorizedException('Invalid or expired code.');
    }
    await this.assertCanUseOtp(user.id);

    const row = await this.latestLiveToken(user.id);
    if (!row) {
      this.logger.error(
        `verify_otp_failure reason=no_token userId=${user.id} emailDomain=${domain}`,
        `AuthService.verifyOtp`,
      );
      throw new UnauthorizedException('Invalid or expired code.');
    }

    if (row.expires_at.getTime() <= Date.now()) {
      await this.consume(row.id);
      this.logger.error(
        `verify_otp_failure reason=expired tokenId=${row.id} userId=${user.id} emailDomain=${domain}`,
        `AuthService.verifyOtp`,
      );
      throw new UnauthorizedException('Code expired.');
    }
    if (row.attempt_count >= this.otpMaxAttempts) {
      await this.consume(row.id);
      this.logger.error(
        `verify_otp_failure reason=max_attempts tokenId=${row.id} userId=${user.id} emailDomain=${domain}`,
        `AuthService.verifyOtp`,
      );
      throw new UnauthorizedException('Too many attempts.');
    }
    const expectedHash = hashCredential(code, this.pepper);
    const codeMatches = timingSafeEqualHex(expectedHash, row.token_hash);
    if (!codeMatches) {
      await this.db
        .updateTable('auth_token')
        .set({ attempt_count: row.attempt_count + 1 })
        .where('id', '=', row.id)
        .execute();
      this.logger.error(
        `verify_otp_failure reason=mismatch tokenId=${row.id} userId=${user.id} emailDomain=${domain}`,
        `AuthService.verifyOtp`,
      );
      throw new UnauthorizedException('Invalid or expired code.');
    }

    await this.consume(row.id);
    this.logger.debug(
      `OTP consumed userId=${user.id} tokenId=${row.id}`,
      `AuthService.verifyOtp`,
    );
    const session = await this.completeLogin(user.id);
    this.logger.info(
      `OTP verify success userId=${user.id} emailDomain=${domain}`,
      `AuthService.verifyOtp`,
    );
    return session;
  }

  // ─── Invite: OTP email (activation on first verify — not a magic link) ───────
  async inviteMember(input: {
    email: string;
    tenantId: number;
    firstName?: string;
    lastName?: string;
    invitedBy: number;
  }): Promise<void> {
    const domain = emailDomain(input.email);
    this.logger.debug(
      `Invite start emailDomain=${domain} tenantId=${input.tenantId}`,
      `AuthService.inviteMember`,
    );
    const existing = await this.findByEmail(input.email);
    let userId = existing?.id;
    if (userId === undefined) {
      const created = await this.db
        .insertInto('app_user')
        .values({
          email: input.email,
          first_name: input.firstName,
          last_name: input.lastName,
          account_status: 'invited',
          created_by: input.invitedBy,
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      userId = created.id;
    } else {
      const row = await this.userStatus(userId);
      if (row?.account_status === 'suspended') {
        throw new UnauthorizedException('Account is suspended.');
      }
      if (row?.account_status === 'active') {
        this.logger.info(
          `Invite skipped user already active userId=${userId}`,
          `AuthService.inviteMember`,
        );
        return;
      }
      await this.db
        .updateTable('app_user')
        .set({ account_status: 'invited', updated_by: input.invitedBy })
        .where('id', '=', userId)
        .execute();
    }
    await this.db
      .insertInto('user_tenant_membership')
      .values({
        user_id: userId,
        tenant_id: input.tenantId,
        role: 'member',
        created_by: input.invitedBy,
      })
      .onConflict((oc) => oc.columns(['user_id', 'tenant_id']).doNothing())
      .execute();
    const code = await this.mintOtp(userId);
    await this.mailer.sendInviteOtp(input.email, code);
    this.logger.info(
      `Invite OTP sent userId=${userId} tenantId=${input.tenantId}`,
      `AuthService.inviteMember`,
    );
  }

  // ─── Refresh / me ──────────────────────────────────────────────────────────────
  async refresh(refreshToken: string): Promise<Session> {
    this.logger.debug(`Refresh start`, `AuthService.refresh`);
    let sub: number;
    try {
      ({ sub } = await this.jwt.verifyRefreshToken(refreshToken));
    } catch {
      this.logger.error(
        `refresh_failure reason=invalid_token`,
        `AuthService.refresh`,
      );
      throw new UnauthorizedException('Invalid refresh token.');
    }
    await this.assertCanUseOtp(sub);
    const user = await this.publicUser(sub);
    const accessToken = await this.jwt.issueAccessToken({
      sub: user.id,
      email: user.email,
      tid: user.tenant.id,
      role: user.role,
    });
    const nextRefreshToken = await this.jwt.issueRefreshToken(user.id);
    this.logger.info(
      `Refresh success userId=${user.id} tenantId=${user.tenant.id}`,
      `AuthService.refresh`,
    );
    return { accessToken, refreshToken: nextRefreshToken, user };
  }

  logout(): void {
    this.logger.info(`Logout`, `AuthService.logout`);
  }

  async me(userId: number): Promise<PublicUser> {
    return this.publicUser(userId);
  }

  // ─── Internals ───────────────────────────────────────────────────────────────
  private findByEmail(email: string) {
    return this.db
      .selectFrom('app_user')
      .select('id')
      .where('email', '=', email)
      .executeTakeFirst();
  }

  private userStatus(userId: number) {
    return this.db
      .selectFrom('app_user')
      .select(['id', 'account_status'])
      .where('id', '=', userId)
      .executeTakeFirst();
  }

  private async canRequestOtp(userId: number): Promise<boolean> {
    const row = await this.userStatus(userId);
    return row?.account_status === 'active' || row?.account_status === 'invited';
  }

  private async assertCanUseOtp(userId: number): Promise<void> {
    const row = await this.userStatus(userId);
    if (!row) {
      throw new UnauthorizedException('Invalid or expired code.');
    }
    if (row.account_status === 'suspended') {
      throw new UnauthorizedException('Account is suspended.');
    }
  }

  private async activateOnFirstOtp(userId: number): Promise<void> {
    await this.db
      .updateTable('app_user')
      .set({
        account_status: 'active',
        email_verified_at: new Date(),
      })
      .where('id', '=', userId)
      .where('account_status', '=', 'invited')
      .execute();
  }

  private async mintOtp(userId: number): Promise<string> {
    const code = generateOtp(this.otpLength);
    await this.supersede(userId);
    await this.db
      .insertInto('auth_token')
      .values({
        user_id: userId,
        kind: 'otp',
        token_hash: hashCredential(code, this.pepper),
        expires_at: new Date(Date.now() + this.otpTtlSec * 1000),
      })
      .execute();
    return code;
  }

  private supersede(userId: number): Promise<unknown> {
    return this.db
      .updateTable('auth_token')
      .set({ consumed_at: new Date() })
      .where('user_id', '=', userId)
      .where('kind', '=', 'otp')
      .where('consumed_at', 'is', null)
      .execute();
  }

  private latestLiveToken(userId: number) {
    return this.db
      .selectFrom('auth_token')
      .selectAll()
      .where('user_id', '=', userId)
      .where('kind', '=', 'otp')
      .where('consumed_at', 'is', null)
      .orderBy('created_at', 'desc')
      .executeTakeFirst();
  }

  private consume(id: number): Promise<unknown> {
    return this.db
      .updateTable('auth_token')
      .set({ consumed_at: new Date() })
      .where('id', '=', id)
      .execute();
  }

  private async completeLogin(userId: number): Promise<Session> {
    this.logger.debug(
      `Login complete start userId=${userId}`,
      `AuthService.completeLogin`,
    );
    await this.assertCanUseOtp(userId);
    await this.activateOnFirstOtp(userId);
    await this.db
      .updateTable('app_user')
      .set({ last_signed_in_at: new Date() })
      .where('id', '=', userId)
      .execute();
    await this.db
      .updateTable('app_user')
      .set({ email_verified_at: new Date() })
      .where('id', '=', userId)
      .where('email_verified_at', 'is', null)
      .execute();

    const user = await this.publicUser(userId);
    const accessToken = await this.jwt.issueAccessToken({
      sub: user.id,
      email: user.email,
      tid: user.tenant.id,
      role: user.role,
    });
    const refreshToken = await this.jwt.issueRefreshToken(user.id);
    this.logger.info(
      `Session issued userId=${user.id} tenantId=${user.tenant.id}`,
      `AuthService.completeLogin`,
    );
    return { accessToken, refreshToken, user };
  }

  private async publicUser(userId: number): Promise<PublicUser> {
    const u = await this.db
      .selectFrom('app_user')
      .innerJoin('user_tenant_membership as m', 'm.user_id', 'app_user.id')
      .innerJoin('tenant as t', 't.id', 'm.tenant_id')
      .select([
        'app_user.id as id',
        'app_user.email as email',
        'app_user.first_name as first_name',
        'app_user.last_name as last_name',
        'app_user.email_verified_at as email_verified_at',
        'app_user.account_status as account_status',
        'app_user.is_platform_admin as is_platform_admin',
        'm.role as role',
        't.id as tenant_id',
        't.name as tenant_name',
      ])
      .where('app_user.id', '=', userId)
      // One membership per user for now; pick the earliest deterministically.
      .orderBy('m.created_at', 'asc')
      .executeTakeFirst();
    if (!u) throw new UnauthorizedException('Account or membership not found.');
    const tenantRole = u.role === 'tenant_admin' ? 'tenant_admin' : 'member';
    const permissions = await this.permissions.forUser({
      userId: u.id,
      tenantId: u.tenant_id,
      isPlatformAdmin: u.is_platform_admin,
      tenantRole,
    });
    return {
      id: u.id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      emailVerified: u.email_verified_at !== null,
      accountStatus: u.account_status as AccountStatus,
      role: u.role,
      isPlatformAdmin: u.is_platform_admin,
      tenant: { id: u.tenant_id, name: u.tenant_name },
      permissions,
    };
  }
}
