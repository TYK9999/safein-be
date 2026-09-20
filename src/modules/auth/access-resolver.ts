import {
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kysely } from 'kysely';
import type { Response } from 'express';

import { APP_DB } from '../../database/db.provider';
import type { DB } from '../../database/schema';
import { bindRequestLogActor } from '../../logging/request-log-context';
import { AuthedRequest } from './authed-request';
import { AuthService } from './auth.service';
import { JwtService, type VerifiedAccess } from './jwt.service';
import {
  attachRefreshedAccessToken,
  readRefreshCookie,
  setRefreshCookie,
} from './refresh-cookie';

/**
 * Resolves the caller from a Bearer access token, or from the refresh cookie
 * when the access token is missing or expired — so the user is not sent back
 * through OTP while the refresh cookie is still valid.
 */
@Injectable()
export class AccessResolver {
  constructor(
    private readonly jwt: JwtService,
    private readonly auth: AuthService,
    private readonly config: ConfigService,
    @Inject(APP_DB) private readonly db: Kysely<DB>,
  ) {}

  async resolve(
    req: AuthedRequest,
    res: Response,
    required: boolean,
  ): Promise<VerifiedAccess | undefined> {
    const fromAccess = await this.fromAccessHeader(req);
    if (fromAccess) {
      return this.bindMembership(req, fromAccess);
    }

    const fromRefresh = await this.fromRefreshCookie(req, res);
    if (fromRefresh) {
      return this.bindMembership(req, fromRefresh);
    }

    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid or expired token.');
    }
    if (required) {
      throw new UnauthorizedException('Missing bearer token.');
    }
    return undefined;
  }

  private async fromAccessHeader(
    req: AuthedRequest,
  ): Promise<VerifiedAccess | null> {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return null;
    try {
      return await this.jwt.verifyAccessToken(header.slice('Bearer '.length));
    } catch {
      return null;
    }
  }

  private async fromRefreshCookie(
    req: AuthedRequest,
    res: Response,
  ): Promise<VerifiedAccess | null> {
    const raw = readRefreshCookie(req, this.config);
    if (!raw) return null;
    try {
      const session = await this.auth.refresh(raw);
      setRefreshCookie(res, this.config, session.refreshToken);
      attachRefreshedAccessToken(req, res, session.accessToken);
      return await this.jwt.verifyAccessToken(session.accessToken);
    } catch {
      return null;
    }
  }

  private async bindMembership(
    req: AuthedRequest,
    claims: VerifiedAccess,
  ): Promise<VerifiedAccess> {
    const membership = await this.db
      .selectFrom('user_tenant_membership as m')
      .innerJoin('app_user as u', 'u.id', 'm.user_id')
      .select(['m.role', 'u.account_status'])
      .where('m.user_id', '=', claims.sub)
      .where('m.tenant_id', '=', claims.tid)
      .executeTakeFirst();
    if (!membership) {
      throw new UnauthorizedException(
        'Account is not an active member of this workspace.',
      );
    }
    if (membership.account_status !== 'active') {
      throw new UnauthorizedException('Account is not active.');
    }
    const verified = { ...claims, role: membership.role };
    req.user = verified;
    bindRequestLogActor({ userId: claims.sub, tenantId: claims.tid });
    return verified;
  }
}
