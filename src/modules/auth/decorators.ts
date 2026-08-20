import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';

import type { AuthedRequest } from './authed-request';
import type { VerifiedAccess } from './jwt.service';

/** Marks a route as reachable without a valid access token. */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Injects the verified access-token claims set on the request by the guard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): VerifiedAccess => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    return req.user as VerifiedAccess;
  },
);

/**
 * Like CurrentUser but returns undefined for an anonymous caller. Use on routes
 * guarded by OptionalJwtGuard, where a token is optional.
 */
export const OptionalUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): VerifiedAccess | undefined => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    return req.user;
  },
);
