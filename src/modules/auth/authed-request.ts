import type { FastifyRequest } from 'fastify';

import type { VerifiedAccess } from './jwt.service';

/**
 * A request after JwtAuthGuard has run: it attaches the verified access-token
 * claims as `user`. Typed so the guard and @CurrentUser() avoid `any`.
 */
export type AuthedRequest = FastifyRequest & { user?: VerifiedAccess };
