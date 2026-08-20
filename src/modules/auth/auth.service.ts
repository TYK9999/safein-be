import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kysely } from 'kysely';

import { APP_DB } from '../../database/db.provider';
import { COMMUNITY_TENANT_ID } from '../../database/schema';
import type { DB } from '../../database/schema';
import { JwtService } from './jwt.service';
import { MailerService } from './mailer.service';
import {
  generateOpaqueToken,
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
  role: string;
  tenant: { id: number; slug: string; name: string };
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

/**
 * Passwordless signup + login: email OTP and magic link. Deliberately simple —
 * one user table, one token table, no tenancy/roles/anonymity yet.
 */
@Injectable()
export class AuthService {
  private readonly pepper: Buffer;

  constructor(
    @Inject(APP_DB) private readonly db: Kysely<DB>,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly mailer: MailerService,
  ) {
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
  private get magicTtlSec(): number {
    return this.config.getOrThrow<number>('otp.magicLinkTtlSec');
  }

  // ─── Signup ─────────────────────────────────────────────────────────────────
  async register(
    email: string,
    firstName?: string,
    lastName?: string,
  ): Promise<void> {
    const existing = await this.findByEmail(email);
    let userId = existing?.id;
    if (userId === undefined) {
      const created = await this.db
        .insertInto('app_user')
        .values({ email, first_name: firstName, last_name: lastName })
        .returning('id')
        .executeTakeFirstOrThrow();
      userId = created.id;
    }
    // Self-registration joins the Community tenant as a worker (self-created).
    await this.db
      .insertInto('user_tenant_membership')
      .values({
        user_id: userId,
        tenant_id: COMMUNITY_TENANT_ID,
        role: 'worker',
        created_by: userId,
      })
      .onConflict((oc) => oc.columns(['user_id', 'tenant_id']).doNothing())
      .execute();
    const code = await this.mintOtp(userId);
    await this.mailer.sendOtp(email, code);
  }

  // ─── Login: OTP ───────────────────────────────────────────────────────────────
  async requestOtp(email: string): Promise<void> {
    const user = await this.findByEmail(email);
    if (!user) return; // no account enumeration
    const code = await this.mintOtp(user.id);
    await this.mailer.sendOtp(email, code);
  }

  async verifyOtp(email: string, code: string): Promise<Session> {
    const user = await this.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid or expired code.');

    const row = await this.latestLiveToken(user.id, 'otp');
    if (!row) throw new UnauthorizedException('Invalid or expired code.');

    if (row.expires_at.getTime() <= Date.now()) {
      await this.consume(row.id);
      throw new UnauthorizedException('Code expired.');
    }
    if (row.attempt_count >= this.otpMaxAttempts) {
      await this.consume(row.id);
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
      throw new UnauthorizedException('Invalid or expired code.');
    }

    await this.consume(row.id);
    return this.completeLogin(user.id);
  }

  // ─── Login: magic link ────────────────────────────────────────────────────────
  async requestMagicLink(email: string): Promise<void> {
    const user = await this.findByEmail(email);
    if (!user) return;
    const raw = generateOpaqueToken();
    await this.supersede(user.id, 'magic_link');
    await this.db
      .insertInto('auth_token')
      .values({
        user_id: user.id,
        kind: 'magic_link',
        token_hash: hashCredential(raw, this.pepper),
        expires_at: new Date(Date.now() + this.magicTtlSec * 1000),
      })
      .execute();
    const url = `${this.config.get<string>('appUrl')}/api/v1/auth/magic/${raw}`;
    await this.mailer.sendMagicLink(email, url);
  }

  async verifyMagicLink(rawToken: string): Promise<Session> {
    const row = await this.db
      .selectFrom('auth_token')
      .selectAll()
      .where('kind', '=', 'magic_link')
      .where('token_hash', '=', hashCredential(rawToken, this.pepper))
      .where('consumed_at', 'is', null)
      .executeTakeFirst();

    if (!row) throw new UnauthorizedException('Invalid or expired link.');
    if (row.expires_at.getTime() <= Date.now()) {
      await this.consume(row.id);
      throw new UnauthorizedException('Link expired.');
    }
    await this.consume(row.id);
    return this.completeLogin(row.user_id);
  }

  // ─── Refresh / me ──────────────────────────────────────────────────────────────
  async refresh(
    refreshToken: string,
  ): Promise<{ accessToken: string; user: PublicUser }> {
    let sub: number;
    try {
      ({ sub } = await this.jwt.verifyRefreshToken(refreshToken));
    } catch {
      throw new UnauthorizedException('Invalid refresh token.');
    }
    const user = await this.publicUser(sub);
    const accessToken = await this.jwt.issueAccessToken({
      sub: user.id,
      email: user.email,
      tid: user.tenant.id,
      role: user.role,
    });
    return { accessToken, user };
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

  private async mintOtp(userId: number): Promise<string> {
    const code = generateOtp(this.otpLength);
    await this.supersede(userId, 'otp');
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

  private supersede(
    userId: number,
    kind: 'otp' | 'magic_link',
  ): Promise<unknown> {
    return this.db
      .updateTable('auth_token')
      .set({ consumed_at: new Date() })
      .where('user_id', '=', userId)
      .where('kind', '=', kind)
      .where('consumed_at', 'is', null)
      .execute();
  }

  private latestLiveToken(userId: number, kind: 'otp' | 'magic_link') {
    return this.db
      .selectFrom('auth_token')
      .selectAll()
      .where('user_id', '=', userId)
      .where('kind', '=', kind)
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
        'm.role as role',
        't.id as tenant_id',
        't.slug as tenant_slug',
        't.name as tenant_name',
      ])
      .where('app_user.id', '=', userId)
      // One membership per user for now; pick the earliest deterministically.
      .orderBy('m.created_at', 'asc')
      .executeTakeFirst();
    if (!u) throw new UnauthorizedException('Account or membership not found.');
    return {
      id: u.id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      emailVerified: u.email_verified_at !== null,
      role: u.role,
      tenant: { id: u.tenant_id, slug: u.tenant_slug, name: u.tenant_name },
    };
  }
}
