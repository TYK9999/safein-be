import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { requestLogContext } from './request-log-context';

/**
 * Runs after nestjs-pino so `req.id` is set. Domain logs then inherit requestId
 * via AsyncLocalStorage without threading it through every method.
 */
@Injectable()
export class RequestLogContextMiddleware implements NestMiddleware {
  use(
    req: Request & { id?: string },
    _res: Response,
    next: NextFunction,
  ): void {
    const header = req.headers['x-request-id'];
    const requestId =
      req.id != null && String(req.id).length > 0
        ? String(req.id)
        : typeof header === 'string' && header.trim().length > 0
          ? header.trim()
          : undefined;
    requestLogContext.run({ requestId }, () => next());
  }
}
