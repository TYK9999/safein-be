import { parseEnv } from './env.schema';

const pemFromEnv = (value: string | undefined): string | null =>
  value ? value.replace(/\\n/g, '\n') : null;

/**
 * Nested config tree expected by ported domain modules, plus flat keys used by
 * messaging / realtime / health.
 */
export function loadConfiguration() {
  const env = parseEnv(process.env);
  const corsOrigins =
    env.CORS_ORIGINS !== undefined && env.CORS_ORIGINS.trim().length > 0
      ? env.CORS_ORIGINS.split(',')
          .map((o) => o.trim())
          .filter(Boolean)
      : env.SOCKET_IO_CORS_ORIGINS;

  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    appUrl: env.APP_URL,
    publicBaseUrl: env.PUBLIC_BASE_URL ?? env.APP_URL,
    corsOrigins,
    socketIoCorsOrigins: env.SOCKET_IO_CORS_ORIGINS,
    databaseUrl: env.DATABASE_URL,
    logLevel: env.LOG_LEVEL,

    awsRegion: env.AWS_REGION,
    sesFromEmail: env.SES_FROM_EMAIL,
    sesReplyTo: env.SES_REPLY_TO,
    snsSmsType: env.SNS_SMS_TYPE,
    snsSmsSenderId: env.SNS_SMS_SENDER_ID,

    database: {
      url: env.DATABASE_URL,
      ssl: env.DATABASE_SSL === 'true',
      iamAuth: env.DATABASE_IAM_AUTH === 'true',
    },
    logger: {
      level: env.LOG_LEVEL,
    },
    jwt: {
      privateKey: pemFromEnv(env.JWT_PRIVATE_KEY),
      publicKey: pemFromEnv(env.JWT_PUBLIC_KEY),
      issuer: env.JWT_ISSUER,
      accessTtlSec: env.ACCESS_TOKEN_TTL,
      refreshTtlSec: env.REFRESH_TOKEN_TTL,
    },
    otp: {
      ttlSec: env.OTP_TTL,
      length: env.OTP_LENGTH,
      maxAttempts: env.OTP_MAX_ATTEMPTS,
      hashSecret: env.OTP_HASH_SECRET,
    },
    cookies: {
      refreshName: env.REFRESH_COOKIE_NAME,
      secure: env.COOKIE_SECURE,
      domain: env.COOKIE_DOMAIN,
    },
    uploads: {
      dataDir: env.DATA_DIR,
      maxPartBytes: env.UPLOAD_MAX_PART_BYTES,
      maxParts: env.UPLOAD_MAX_PARTS,
      sessionTtlMinutes: env.UPLOAD_SESSION_TTL_MINUTES,
      reaperCron: env.UPLOAD_REAPER_CRON,
      reaperEnabled: env.UPLOAD_REAPER_ENABLED,
      urlSecret: env.UPLOAD_URL_SECRET || null,
      urlTtlSeconds: env.UPLOAD_URL_TTL_SECONDS,
      s3Bucket: env.S3_BUCKET_NAME,
    },
    aws: {
      region: env.AWS_REGION,
      s3Endpoint: env.S3_ENDPOINT,
      s3ForcePathStyle: env.S3_FORCE_PATH_STYLE,
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
    thumbnail: {
      sweepEnabled: env.THUMBNAIL_SWEEP_ENABLED,
      sweepIntervalMs: env.THUMBNAIL_SWEEP_INTERVAL_MS,
      maxAttempts: env.THUMBNAIL_MAX_ATTEMPTS,
      ffmpegPath: env.FFMPEG_PATH,
    },
    playback: {
      sweepEnabled: env.PLAYBACK_SWEEP_ENABLED,
      sweepIntervalMs: env.PLAYBACK_SWEEP_INTERVAL_MS,
      maxAttempts: env.PLAYBACK_MAX_ATTEMPTS,
      ffmpegThreads: env.PLAYBACK_FFMPEG_THREADS,
      ffmpegPath: env.FFMPEG_PATH,
    },
    audio: {
      maxBytes: env.AUDIO_MAX_BYTES,
    },
    transcribe: {
      region: env.TRANSCRIBE_REGION ?? env.AWS_REGION,
      endpoint: env.TRANSCRIBE_ENDPOINT,
      languageOptions: env.TRANSCRIBE_LANGUAGE_OPTIONS.split(',')
        .map((c) => c.trim())
        .filter(Boolean),
      defaultLanguage: env.TRANSCRIBE_DEFAULT_LANGUAGE,
    },
    cursor: {
      apiKey: env.CURSOR_API_KEY,
      model: env.CURSOR_MODEL,
    },
  };
}

export type AppConfig = ReturnType<typeof loadConfiguration>;

export default loadConfiguration;
