import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingModule } from './logging/logging.module';
import { AppLoggerService } from './logging/app-logger.service';
import { RequestLogContextMiddleware } from './logging/request-log-context.middleware';
import { AudioModule } from './modules/audio/audio.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { SignalsModule } from './modules/signals/signals.module';
import { SttModule } from './modules/stt/stt.module';
import { Take5Module } from './modules/take5/take5.module';
import { UploadsModule } from './modules/uploads/uploads.module';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.getOrThrow<string>('logLevel'),
          autoLogging: true,
          genReqId: (req, res) => {
            const header = req.headers['x-request-id'];
            const id =
              typeof header === 'string' && header.trim().length > 0
                ? header.trim()
                : randomUUID();
            res.setHeader('x-request-id', id);
            return id;
          },
          customProps: (req) => ({
            requestId: req.id,
          }),
          serializers: {
            req: (req: { method?: string; url?: string; id?: string }) => ({
              id: req.id,
              method: req.method,
              url: req.url,
            }),
            res: (res: { statusCode?: number }) => ({
              statusCode: res.statusCode,
            }),
          },
          // Never log bodies (OTP / tokens / PII risk).
          transport:
            config.get<string>('nodeEnv') === 'development'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
        },
      }),
    }),
    LoggingModule,
    ScheduleModule.forRoot(),
    DatabaseModule,
    MessagingModule,
    AuthModule,
    SignalsModule,
    AudioModule,
    SttModule,
    UploadsModule,
    Take5Module,
    HealthModule,
    RealtimeModule,
  ],
  providers: [
    RequestLogContextMiddleware,
    {
      provide: APP_FILTER,
      useFactory: (logger: AppLoggerService, config: ConfigService) =>
        new AllExceptionsFilter(logger, config),
      inject: [AppLoggerService, ConfigService],
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // After nestjs-pino (imported above) so req.id is available.
    consumer.apply(RequestLogContextMiddleware).forRoutes('*');
  }
}
