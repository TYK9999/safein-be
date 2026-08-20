import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Kysely } from 'kysely';

import { APP_DB } from '../../database/db.provider';
import type { DB } from '../../database/schema';
import { AuthedRequest } from './authed-request';
import { JwtService, type VerifiedAccess } from './jwt.service';

/**
 * Optional authentication. Unlike JwtAuthGuard this NEVER rejects a request that
 * has no token — it just leaves `req.user` unset (an anonymous caller). But if a
 * token IS supplied it must be valid AND belong to a current tenant member, same
 * as the mandatory guard; a present-but-broken token is a 401 (not silently
 * treated as anonymous). Use it on routes that work with or without a login.
 */
@Injectable()
export class OptionalJwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    @Inject(APP_DB) private readonly db: Kysely<DB>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return true; // anonymous — allowed

    let claims: VerifiedAccess;
    try {
      claims = await this.jwt.verifyAccessToken(header.slice('Bearer '.length));
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }

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

    req.user = { ...claims, role: membership.role };
    return true;
  }
}
