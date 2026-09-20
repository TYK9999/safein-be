import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { getRequestLogBindings } from './request-log-context';

/**
 * Central app logger. Nest-classic call style:
 *   logger.info('Fetched associates', 'AssociateService.getNCTAssociates')
 *   logger.error(err.message, { error }, 'AssociateService.getNCTAssociates')
 *   logger.debug(`Fetched: ${JSON.stringify(rows)}`, 'AssociateService.getNCTAssociates')
 *
 * Trailing string = per-call context. Optional middle objects = structured fields.
 * requestId (and optional userId/tenantId) merge from ALS during HTTP requests.
 */
@Injectable({ scope: Scope.TRANSIENT })
export class AppLoggerService implements LoggerService {
  private defaultContext?: string;

  constructor(private readonly pino: PinoLogger) {}

  setContext(context: string): void {
    this.defaultContext = context;
    this.pino.setContext(context);
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write('info', message, optionalParams);
  }

  info(message: unknown, ...optionalParams: unknown[]): void {
    this.write('info', message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.write('error', message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write('warn', message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write('debug', message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write('trace', message, optionalParams);
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.write('fatal', message, optionalParams);
  }

  private write(
    level: 'info' | 'error' | 'warn' | 'debug' | 'trace' | 'fatal',
    message: unknown,
    optionalParams: unknown[],
  ): void {
    const { obj, msg, err, callContext } = normalizeLogArgs(
      message,
      optionalParams,
    );
    const context = callContext ?? this.defaultContext;
    if (context) {
      this.pino.setContext(context);
    }

    const bindings = getRequestLogBindings();
    const merged = {
      ...(bindings.requestId ? { requestId: bindings.requestId } : {}),
      ...(bindings.userId !== undefined ? { userId: bindings.userId } : {}),
      ...(bindings.tenantId !== undefined ? { tenantId: bindings.tenantId } : {}),
      ...obj,
    };
    if (err) {
      this.pino[level]({ ...merged, err }, msg);
      return;
    }
    if (Object.keys(merged).length > 0) {
      this.pino[level](merged, msg);
      return;
    }
    this.pino[level](msg);
  }
}

function normalizeLogArgs(
  message: unknown,
  optionalParams: unknown[],
): {
  obj?: Record<string, unknown>;
  msg: string;
  err?: Error;
  callContext?: string;
} {
  const params = [...optionalParams];
  let callContext: string | undefined;

  // Nest Logger: trailing string is the context (e.g. Service.method).
  if (params.length > 0 && typeof params[params.length - 1] === 'string') {
    callContext = params.pop() as string;
  }

  let err: Error | undefined;
  const extras: Record<string, unknown> = {};

  for (const param of params) {
    if (param instanceof Error) {
      err = param;
    } else if (param && typeof param === 'object' && !Array.isArray(param)) {
      Object.assign(extras, param as Record<string, unknown>);
    }
  }

  if (message instanceof Error) {
    return {
      err: message,
      msg: message.message,
      obj: Object.keys(extras).length ? extras : undefined,
      callContext,
    };
  }

  // String message: emit as-is (including full JSON dumps).
  if (typeof message === 'string') {
    return {
      obj: Object.keys(extras).length ? extras : undefined,
      msg: message,
      err,
      callContext,
    };
  }

  if (message && typeof message === 'object' && !Array.isArray(message)) {
    const record = message as Record<string, unknown>;
    const msg =
      typeof record.msg === 'string'
        ? record.msg
        : typeof record.message === 'string'
          ? record.message
          : 'log';
    const { msg: _m, message: _message, ...rest } = record;
    return {
      obj: { ...rest, ...extras },
      msg,
      err,
      callContext,
    };
  }

  return {
    obj: Object.keys(extras).length ? extras : undefined,
    msg: String(message),
    err,
    callContext,
  };
}
