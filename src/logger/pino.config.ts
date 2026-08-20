import { randomUUID } from 'node:crypto';
import type { Params } from 'nestjs-pino';

/**
 * Central pino configuration for the whole app. Owned by LoggerModule; nothing
 * else should configure logging. Adds a per-request id (echoed as X-Request-Id)
 * and logs ONE concise message per request (method, path, status, latency) —
 * never the full request/response objects (headers, query, body). Pretty-prints
 * outside production.
 */
/** Mask the single-use magic-link login token (a path param) so it never
 * reaches the logs. Query strings are kept (they carry filters, not secrets). */
function safeUrl(url?: string): string {
  return (url ?? '').replace(/(\/auth\/magic\/)[^/?]+/, '$1[redacted]');
}

export const loggerParams: Params = {
  pinoHttp: {
    level: process.env.LOG_LEVEL,

    genReqId(req, res) {
      const id = req.headers['x-request-id']?.toString() ?? randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },

    customProps(req) {
      return { requestId: req.id };
    },

    // Emit a single readable line per request instead of pino-http's default
    // serialized req/res objects.
    customSuccessMessage(req, res, responseTime) {
      return `${req.method} ${safeUrl(req.url)} ${res.statusCode} (${responseTime}ms)`;
    },
    customErrorMessage(req, res, err) {
      return `${req.method} ${safeUrl(req.url)} ${res.statusCode} - ${err.message}`;
    },
    // Drop the request/response objects from the log entirely: the message above
    // carries what we need, and this guarantees no headers/query/body are logged.
    serializers: {
      req: () => undefined,
      res: () => undefined,
    },

    transport:
      process.env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          }
        : undefined,

    // Defense-in-depth: inert while the req/res serializers above return nothing,
    // but keeps these fields redacted if full serialization is ever re-enabled.
    redact: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.code',
      'req.body.token',
    ],
  },
};
