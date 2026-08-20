import { Global, Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

import { AppLoggerService } from './app-logger.service';
import { loggerParams } from './pino.config';

/**
 * Centralised logging. The single place logging is configured.
 *
 * @Global so any module can inject AppLoggerService without importing this.
 * Re-exports nestjs-pino's module so `app.useLogger(app.get(Logger))` in main.ts
 * routes Nest's own logs (and HTTP request logs) through the same pino instance.
 */
@Global()
@Module({
  imports: [PinoLoggerModule.forRoot(loggerParams)],
  providers: [AppLoggerService],
  exports: [AppLoggerService, PinoLoggerModule],
})
export class LoggerModule {}
