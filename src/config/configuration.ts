/**
 * Maps the (already-validated) environment into the app's config tree. There are
 * NO defaults here — EnvSchema guarantees required keys are present, so we read
 * them straight through. Optional keys pass through as null/undefined; the values
 * that only some modes need (DATA_DIR, AWS_*) are enforced by the backend that
 * uses them (via ConfigService.getOrThrow).
 */

/**
 * PEM keys arrive via env. A .env / docker env_file can't hold real newlines, so
 * accept single-line values with escaped "\n" too (real multi-line PEMs pass
 * through unchanged). Returns null when unset so the JWT service decides what to do
 * (ephemeral keypair in dev; required in production).
 */
const pemFromEnv = (value: string | undefined): string | null =>
  value ? value.replace(/\\n/g, '\n') : null;

export default () => ({
  nodeEnv: process.env.NODE_ENV,
  appUrl: process.env.APP_URL,
  // Browser origins allowed to call the API (CORS). Comma-separated -> array.
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  // Backend's own public base URL for signed upload URLs; falls back to APP_URL.
  publicBaseUrl: process.env.PUBLIC_BASE_URL || process.env.APP_URL,
  port: Number(process.env.PORT),

  database: {
    url: process.env.DATABASE_URL,
    // TLS to Postgres — required by RDS (and most managed Postgres) by default.
    ssl: process.env.DATABASE_SSL === 'true',
    // Authenticate to RDS with a per-connection IAM token instead of a password.
    iamAuth: process.env.DATABASE_IAM_AUTH === 'true',
  },

  logger: {
    level: process.env.LOG_LEVEL,
  },

  jwt: {
    privateKey: pemFromEnv(process.env.JWT_PRIVATE_KEY),
    publicKey: pemFromEnv(process.env.JWT_PUBLIC_KEY),
    issuer: process.env.JWT_ISSUER,
    accessTtlSec: Number(process.env.ACCESS_TOKEN_TTL),
    refreshTtlSec: Number(process.env.REFRESH_TOKEN_TTL),
  },

  otp: {
    ttlSec: Number(process.env.OTP_TTL),
    length: Number(process.env.OTP_LENGTH),
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS),
    magicLinkTtlSec: Number(process.env.MAGIC_LINK_TTL),
    hashSecret: process.env.OTP_HASH_SECRET,
  },

  cookies: {
    refreshName: process.env.REFRESH_COOKIE_NAME,
    secure: process.env.COOKIE_SECURE === 'true',
    domain: process.env.COOKIE_DOMAIN || undefined,
  },

  uploads: {
    // Required only for local storage; enforced in LocalPartStorage.
    dataDir: process.env.DATA_DIR || undefined,
    maxPartBytes: Number(process.env.UPLOAD_MAX_PART_BYTES),
    maxParts: Number(process.env.UPLOAD_MAX_PARTS),
    sessionTtlMinutes: Number(process.env.UPLOAD_SESSION_TTL_MINUTES),
    reaperCron: process.env.UPLOAD_REAPER_CRON,
    reaperEnabled: process.env.UPLOAD_REAPER_ENABLED === 'true',
    // Optional: blank => an ephemeral signing secret is generated at boot.
    urlSecret: process.env.UPLOAD_URL_SECRET || null,
    urlTtlSeconds: Number(process.env.UPLOAD_URL_TTL_SECONDS),
    // Optional: set => store in S3; absent => local DATA_DIR.
    s3Bucket: process.env.S3_BUCKET_NAME || null,
  },

  // Object storage (S3). Required fields are enforced in S3PartStorage.
  aws: {
    region: process.env.AWS_REGION || undefined,
    s3Endpoint: process.env.S3_ENDPOINT || undefined,
    s3ForcePathStyle: process.env.S3_FORCE_PATH_STYLE || undefined,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || undefined,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || undefined,
  },

  // Background video-thumbnail generation (ffmpeg -> sharp -> S3).
  thumbnail: {
    sweepEnabled: process.env.THUMBNAIL_SWEEP_ENABLED === 'true',
    sweepIntervalMs: Number(process.env.THUMBNAIL_SWEEP_INTERVAL_MS),
    maxAttempts: Number(process.env.THUMBNAIL_MAX_ATTEMPTS),
    // Blank => fall back to the bundled ffmpeg-static binary.
    ffmpegPath: process.env.FFMPEG_PATH || undefined,
  },

  // Background transcode to a streamable H.264/AAC MP4 (ffmpeg -> S3).
  playback: {
    sweepEnabled: process.env.PLAYBACK_SWEEP_ENABLED === 'true',
    sweepIntervalMs: Number(process.env.PLAYBACK_SWEEP_INTERVAL_MS),
    maxAttempts: Number(process.env.PLAYBACK_MAX_ATTEMPTS),
    ffmpegThreads: Number(process.env.PLAYBACK_FFMPEG_THREADS),
    // Shared with the thumbnail sweep; blank => bundled ffmpeg-static binary.
    ffmpegPath: process.env.FFMPEG_PATH || undefined,
  },

  audio: {
    maxBytes: Number(process.env.AUDIO_MAX_BYTES),
  },

  // Speech-to-text (AWS Transcribe). Runs against REAL AWS, not MinIO — unless
  // an endpoint override points it at a local emulator (LocalStack Pro).
  transcribe: {
    region: process.env.TRANSCRIBE_REGION || process.env.AWS_REGION,
    endpoint: process.env.TRANSCRIBE_ENDPOINT || undefined,
    languageOptions: (process.env.TRANSCRIBE_LANGUAGE_OPTIONS ?? '')
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean),
    // BCP-47 language pinned when a request omits `language`. Unset => auto-detect.
    defaultLanguage: process.env.TRANSCRIBE_DEFAULT_LANGUAGE || undefined,
  },
});
