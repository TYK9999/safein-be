import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Response } from 'express';

import { AuthedRequest } from './authed-request';
import { AccessResolver } from './access-resolver';

/**
 * Optional authentication. No token and no refresh cookie → anonymous
 * (`req.user` unset). A valid access token, or an expired access token with a
 * live refresh cookie, authenticates the caller.
 */
@Injectable()
export class OptionalJwtGuard implements CanActivate {
  constructor(private readonly access: AccessResolver) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const res = context.switchToHttp().getResponse<Response>();
    await this.access.resolve(req, res, false);
    return true;
  }
}
