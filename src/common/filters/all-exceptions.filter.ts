import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AppLoggerService } from '../../logging/app-logger.service';

export type ApiErrorBody = {
  code: string;
  message: string;
  requestId?: string;
};

type RequestWithId = Request & { id?: string };

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly config: ConfigService,
  ) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      this.logger.error(
        'Non-HTTP exception',
        { error: exception },
        'AllExceptionsFilter.catch',
      );
      return;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();
    const requestId = resolveRequestId(request);

    const { status, code, message, logLevel } = this.mapException(exception);
    const body: ApiErrorBody = {
      code,
      message,
      ...(requestId ? { requestId } : {}),
    };

    if (logLevel === 'error') {
      this.logger.error(
        message,
        {
          requestId,
          method: request.method,
          path: request.url,
          status,
          code,
          error: exception instanceof Error ? exception : undefined,
        },
        'AllExceptionsFilter.catch',
      );
    } else if (logLevel === 'warn') {
      this.logger.warn(
        message,
        {
          requestId,
          method: request.method,
          path: request.url,
          status,
          code,
        },
        'AllExceptionsFilter.catch',
      );
    }

    if (requestId && !response.getHeader('x-request-id')) {
      response.setHeader('x-request-id', requestId);
    }
    response.status(status).json(body);
  }

  private mapException(exception: unknown): {
    status: number;
    code: string;
    message: string;
    logLevel: 'error' | 'warn' | 'none';
  } {
    const isProd = this.config.get<string>('nodeEnv') === 'production';

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const { code, message } = normalizeHttpExceptionBody(raw, exception.message);
      return {
        status,
        code,
        message,
        logLevel: status >= 500 ? 'error' : status >= 400 ? 'warn' : 'none',
      };
    }

    // nestjs-zod / Zod-style validation
    if (isZodLikeValidationError(exception)) {
      return {
        status: HttpStatus.BAD_REQUEST,
        code: 'VALIDATION_ERROR',
        message: zodLikeMessage(exception),
        logLevel: 'warn',
      };
    }

    const message = isProd
      ? 'An unexpected error occurred.'
      : exception instanceof Error
        ? exception.message
        : 'An unexpected error occurred.';

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message,
      logLevel: 'error',
    };
  }
}

function resolveRequestId(request: RequestWithId): string | undefined {
  if (typeof request.id === 'string' && request.id.length > 0) {
    return request.id;
  }
  const header = request.headers['x-request-id'];
  if (typeof header === 'string' && header.trim().length > 0) {
    return header.trim();
  }
  return undefined;
}

function normalizeHttpExceptionBody(
  raw: string | object,
  fallbackMessage: string,
): { code: string; message: string } {
  if (typeof raw === 'string') {
    return { code: 'HTTP_ERROR', message: raw };
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.code === 'string' && typeof obj.message === 'string') {
    return { code: obj.code, message: obj.message };
  }
  if (typeof obj.message === 'string') {
    return {
      code: typeof obj.error === 'string' ? toCode(obj.error) : 'HTTP_ERROR',
      message: obj.message,
    };
  }
  if (Array.isArray(obj.message)) {
    return {
      code: 'VALIDATION_ERROR',
      message: obj.message.map(String).join('; '),
    };
  }
  return { code: 'HTTP_ERROR', message: fallbackMessage };
}

function toCode(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '') || 'HTTP_ERROR';
}

function isZodLikeValidationError(exception: unknown): boolean {
  if (!exception || typeof exception !== 'object') return false;
  const name = (exception as { name?: string }).name;
  if (name === 'ZodValidationException' || name === 'ZodError') return true;
  return typeof (exception as { getStatus?: () => number }).getStatus === 'function'
    && (exception as HttpException).getStatus?.() === HttpStatus.BAD_REQUEST
    && name?.includes('Zod') === true;
}

function zodLikeMessage(exception: unknown): string {
  if (exception instanceof HttpException) {
    const raw = exception.getResponse();
    if (typeof raw === 'object' && raw && 'message' in raw) {
      const msg = (raw as { message: unknown }).message;
      if (typeof msg === 'string') return msg;
      if (Array.isArray(msg)) return msg.map(String).join('; ');
    }
    return exception.message;
  }
  if (exception instanceof Error) return exception.message;
  return 'Validation failed';
}
