import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';

import { AuthedRequest } from './authed-request';
import { AccessResolver } from './access-resolver';
import { IS_PUBLIC_KEY } from './decorators';

/**
 * Global guard. Every route requires a valid session unless marked @Public().
 * A short-lived access JWT is preferred. If it is missing or expired, a valid
 * httpOnly refresh cookie is used to mint a new access token and the request
 * continues — the caller is not sent back through OTP.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: AccessResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const res = context.switchToHttp().getResponse<Response>();
    await this.access.resolve(req, res, true);
    return true;
  }
}
