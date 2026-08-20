import { Injectable, Scope } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

/**
 * The application logger. Inject this anywhere and set a context once:
 *
 *   constructor(private readonly logger: AppLoggerService) {
 *     this.logger.setContext(MyService.name);
 *   }
 *   this.logger.log('started');
 *
 * Transient scope so each injecting class gets its own context. Wraps pino
 * (via nestjs-pino) so every log line carries the request id set by LoggerModule.
 */
@Injectable({ scope: Scope.TRANSIENT })
export class AppLoggerService {
  constructor(private readonly pino: PinoLogger) {}

  setContext(context: string): void {
    this.pino.setContext(context);
  }

  log(message: string, ...args: unknown[]): void {
    this.pino.info(message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.pino.info(message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.pino.warn(message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.pino.error(message, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    this.pino.debug(message, ...args);
  }

  verbose(message: string, ...args: unknown[]): void {
    this.pino.trace(message, ...args);
  }
}
