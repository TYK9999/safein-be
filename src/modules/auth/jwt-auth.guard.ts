import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Kysely } from 'kysely';

import { APP_DB } from '../../database/db.provider';
import type { DB } from '../../database/schema';
import { AuthedRequest } from './authed-request';
import { IS_PUBLIC_KEY } from './decorators';
import { JwtService, type VerifiedAccess } from './jwt.service';

/**
 * Global guard. Every route requires a valid EdDSA access token unless marked
 * @Public(). Beyond verifying the signature, the caller must still be a current
 * member of the tenant their token claims — the database is the source of truth,
 * so a token for a deleted user, a non-member, or an unknown tenant is rejected
 * (not just trusted because it is signed). The role is refreshed from the DB so
 * a stale token cannot retain a privilege that has since been revoked. Verified
 * claims are attached to the request as `req.user`.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    @Inject(APP_DB) private readonly db: Kysely<DB>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token.');
    }

    let claims: VerifiedAccess;
    try {
      claims = await this.jwt.verifyAccessToken(header.slice('Bearer '.length));
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    // The token is authentic; confirm the user is still a member of the claimed
    // tenant. A missing membership covers a deleted user, a non-member, and an
    // unknown tenant in one indexed lookup (UNIQUE(user_id, tenant_id)).
    const membership = await this.db
      .selectFrom('user_tenant_membership')
      .select('role')
      .where('user_id', '=', claims.sub)
      .where('tenant_id', '=', claims.tid)
      .executeTakeFirst();
    if (!membership) {
      throw new UnauthorizedException(
        'Account is not an active member of this workspace.',
      );
    }

    // Trust the DB for the role, not the (possibly stale) token claim.
    req.user = { ...claims, role: membership.role };
    return true;
  }
}
