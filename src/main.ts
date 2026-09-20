import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { ZodValidationPipe } from 'nestjs-zod';
import cookieParser from 'cookie-parser';
import { config as loadDotenv } from 'dotenv';
import { AppModule } from './app.module';
import { parseEnv } from './config/env.schema';
import { CorsIoAdapter } from './modules/realtime/cors-io.adapter';

async function bootstrap(): Promise<void> {
  loadDotenv();
  parseEnv(process.env);

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.use(cookieParser());
  app.useGlobalPipes(new ZodValidationPipe());
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const config = app.get(ConfigService);
  const origins = config.getOrThrow<string[]>('corsOrigins');
  app.enableCors({
    origin: origins,
    credentials: true,
    exposedHeaders: ['X-Access-Token'],
  });
  app.useWebSocketAdapter(
    new CorsIoAdapter(app, config.getOrThrow<string[]>('socketIoCorsOrigins')),
  );

  const port = config.getOrThrow<number>('port');
  await app.listen(port);
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
