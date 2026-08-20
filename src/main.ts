// Load .env before anything reads process.env (the Fastify body limit is read
// below, before Nest's ConfigModule initialises). @nestjs/config also loads it
// later; both are idempotent and neither overrides an already-set variable.
import 'dotenv/config';

import {
  NestFastifyApplication,
  FastifyAdapter,
} from '@nestjs/platform-fastify';
import { NestFactory } from '@nestjs/core';
import { RequestMethod, VersioningType } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { ZodValidationPipe } from 'nestjs-zod';
import { ConfigService } from '@nestjs/config';
import fastifyCookie from '@fastify/cookie';
import type { FastifyInstance } from 'fastify';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // Body limit covers a single uploaded video part (raw octet-stream). Read
  // straight from the env (no default) — this runs before Nest's config
  // validation, so fail loudly if it's missing or invalid.
  const maxPartBytes = Number(process.env.UPLOAD_MAX_PART_BYTES);
  if (!Number.isInteger(maxPartBytes) || maxPartBytes <= 0) {
    throw new Error(
      'UPLOAD_MAX_PART_BYTES must be a positive integer (set it in the env).',
    );
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ bodyLimit: maxPartBytes }),
    { bufferLogs: true },
  );

  const config = app.get(ConfigService);
  app.useLogger(app.get(Logger));

  // Nest/Fastify plugin nominal-type mismatch; registration is safe.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  await app.register(fastifyCookie as any);

  // Accept raw binary video parts: hand the body to the route as a Buffer.
  const fastify = app
    .getHttpAdapter()
    .getInstance() as unknown as FastifyInstance;
  fastify.addContentTypeParser(
    'application/octet-stream',
    { parseAs: 'buffer' },
    (_req, body: Buffer, done) => done(null, body),
  );

  // Allow the configured front-end origins (NOT the backend's own APP_URL) to
  // call the API. With credentials, the matched origin is reflected — never '*'.
  app.enableCors({
    origin: config.getOrThrow<string[]>('corsOrigins'),
    credentials: true,
  });

  // /api/v1/... for features; /healthz and /readyz stay at the root.
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'healthz', method: RequestMethod.GET },
      { path: 'readyz', method: RequestMethod.GET },
    ],
  });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(new ZodValidationPipe());
  app.enableShutdownHooks();

  const port = config.getOrThrow<number>('port');
  await app.listen(port, '0.0.0.0');
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection', reason);
});
