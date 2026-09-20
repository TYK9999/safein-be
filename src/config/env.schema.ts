import { z } from 'zod';

const boolEnum = z.enum(['true', 'false']).transform((v) => v === 'true');

const corsOriginsSchema = z
  .string()
  .min(1, 'SOCKET_IO_CORS_ORIGINS is required')
  .transform((value) =>
    value
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
  )
  .refine((origins) => origins.length > 0, {
    message: 'SOCKET_IO_CORS_ORIGINS must list at least one origin',
  });

const optionalUrl = z.preprocess(
  (value) => (value === '' || value === undefined ? undefined : value),
  z.string().url().optional(),
);

const optionalNonEmpty = z.preprocess(
  (value) => (value === '' || value === undefined ? undefined : value),
  z.string().min(1).optional(),
);

/**
 * Runtime environment contract. Fail fast at boot for required keys.
 * Optional AI / endpoint overrides are documented in `.env.example`.
 */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    PORT: z.coerce.number().int().positive(),
    APP_URL: z.string().url(),
    DATABASE_URL: z
      .string()
      .min(1, 'DATABASE_URL is required')
      .refine(
        (value) => value.startsWith('postgres://') || value.startsWith('postgresql://'),
        'DATABASE_URL must be a postgres:// or postgresql:// connection string',
      ),
    DATABASE_SSL: z.enum(['true', 'false']).optional(),
    DATABASE_IAM_AUTH: z.enum(['true', 'false']).optional(),
    LOG_LEVEL: z.preprocess(
      (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
      z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']),
    ),
    SOCKET_IO_CORS_ORIGINS: corsOriginsSchema,
    /** Optional HTTP CORS override; defaults to SOCKET_IO_CORS_ORIGINS. */
    CORS_ORIGINS: z.string().optional(),
    PUBLIC_BASE_URL: optionalUrl,

    AWS_REGION: z.string().min(1, 'AWS_REGION is required'),
    SES_FROM_EMAIL: z.string().email('SES_FROM_EMAIL must be a valid email'),
    SES_REPLY_TO: z.preprocess(
      (value) => (value === '' || value === undefined ? undefined : value),
      z.string().email().optional(),
    ),
    SNS_SMS_TYPE: z.preprocess(
      (value) => (value === '' || value === undefined ? 'Transactional' : value),
      z.enum(['Transactional', 'Promotional']),
    ),
    SNS_SMS_SENDER_ID: optionalNonEmpty,

    JWT_PRIVATE_KEY: z.string().optional(),
    JWT_PUBLIC_KEY: z.string().optional(),
    JWT_ISSUER: z.string().min(1),
    ACCESS_TOKEN_TTL: z.coerce.number().int().positive(),
    REFRESH_TOKEN_TTL: z.coerce.number().int().positive(),

    OTP_TTL: z.coerce.number().int().positive(),
    OTP_LENGTH: z.coerce.number().int().min(4).max(10),
    OTP_MAX_ATTEMPTS: z.coerce.number().int().positive(),
    OTP_HASH_SECRET: z.string().min(16),

    REFRESH_COOKIE_NAME: z.string().min(1),
    COOKIE_SECURE: boolEnum,
    COOKIE_DOMAIN: optionalNonEmpty,

    DATA_DIR: optionalNonEmpty,
    UPLOAD_MAX_PART_BYTES: z.coerce.number().int().positive(),
    UPLOAD_MAX_PARTS: z.coerce.number().int().positive(),
    UPLOAD_SESSION_TTL_MINUTES: z.coerce.number().positive(),
    UPLOAD_REAPER_CRON: z.string().min(1),
    UPLOAD_REAPER_ENABLED: boolEnum,
    UPLOAD_URL_SECRET: z.union([z.literal(''), z.string().min(16)]).optional(),
    UPLOAD_URL_TTL_SECONDS: z.coerce.number().int().positive(),

    S3_BUCKET_NAME: z.string().min(1, 'S3_BUCKET_NAME is required for media modules'),
    S3_ENDPOINT: optionalUrl,
    S3_FORCE_PATH_STYLE: z.enum(['true', 'false']).default('false'),
    AWS_ACCESS_KEY_ID: optionalNonEmpty,
    AWS_SECRET_ACCESS_KEY: optionalNonEmpty,

    THUMBNAIL_SWEEP_ENABLED: boolEnum,
    THUMBNAIL_SWEEP_INTERVAL_MS: z.coerce.number().int().positive(),
    THUMBNAIL_MAX_ATTEMPTS: z.coerce.number().int().positive(),
    FFMPEG_PATH: optionalNonEmpty,

    PLAYBACK_SWEEP_ENABLED: boolEnum,
    PLAYBACK_SWEEP_INTERVAL_MS: z.coerce.number().int().positive(),
    PLAYBACK_MAX_ATTEMPTS: z.coerce.number().int().positive(),
    PLAYBACK_FFMPEG_THREADS: z.coerce.number().int().positive(),

    AUDIO_MAX_BYTES: z.coerce.number().int().positive(),
    TRANSCRIBE_REGION: optionalNonEmpty,
    TRANSCRIBE_ENDPOINT: optionalUrl,
    TRANSCRIBE_LANGUAGE_OPTIONS: z
      .string()
      .refine((v) => v.split(',').some((c) => c.trim().length > 0), {
        message: 'must list at least one language code, e.g. "en-GB"',
      }),
    TRANSCRIBE_DEFAULT_LANGUAGE: z.preprocess(
      (value) => (value === '' || value === undefined ? undefined : value),
      z
        .string()
        .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'must be a BCP-47 code like en-US')
        .optional(),
    ),

    CURSOR_API_KEY: optionalNonEmpty,
    CURSOR_MODEL: optionalNonEmpty,
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && env.SOCKET_IO_CORS_ORIGINS.includes('*')) {
      ctx.addIssue({
        code: 'custom',
        path: ['SOCKET_IO_CORS_ORIGINS'],
        message: 'SOCKET_IO_CORS_ORIGINS must not use * in production',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function parseEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return result.data;
}
