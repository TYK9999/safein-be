import { z } from 'zod';

// A required 'true'/'false' flag (no default — must be set explicitly in env).
const boolEnum = z.enum(['true', 'false']).transform((v) => v === 'true');

/**
 * Every value comes from the environment — there are NO hardcoded defaults.
 * Required keys must be present or the app fails to boot with a clear error.
 * Only genuinely optional features (secrets that fall back to an ephemeral value,
 * and mode-specific storage settings) are `.optional()`; the mode-specific ones
 * (DATA_DIR / AWS_*) are enforced at point of use by the active storage backend.
 */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().positive(),
  APP_URL: z.string().url(),
  /**
   * Comma-separated list of browser ORIGINS allowed to call the API (the PWA /
   * admin front-ends), used for CORS — this is the front-end's origin, NOT the
   * backend's own APP_URL. Credentialed requests require explicit origins (never
   * '*'). e.g. "http://localhost:5173,https://localhost:5173,https://app.example.com".
   */
  CORS_ORIGINS: z.string().min(1),
  /**
   * The backend's own public base URL, used to build signed part-upload URLs.
   * Optional — falls back to APP_URL when unset (set it separately only when the
   * API and the SPA are on different origins).
   */
  PUBLIC_BASE_URL: z.string().url().optional(),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']),

  // ---- Database (single connection) ----
  DATABASE_URL: z.string().url(),
  /** 'true' connects to Postgres over TLS (RDS requires it by default). Optional —
   * local/dev Postgres can omit it. */
  DATABASE_SSL: z.enum(['true', 'false']).optional(),
  /** 'true' authenticates to RDS with an IAM auth token (minted per connection from
   * the instance role) instead of a password — DATABASE_URL then needs no password,
   * TLS is forced, and AWS_REGION must be set. Optional; omit for password auth. */
  DATABASE_IAM_AUTH: z.enum(['true', 'false']).optional(),

  // ---- JWT (EdDSA). Blank in dev => ephemeral keypair generated at boot. ----
  JWT_PRIVATE_KEY: z.string().optional(),
  JWT_PUBLIC_KEY: z.string().optional(),
  JWT_ISSUER: z.string().min(1),
  ACCESS_TOKEN_TTL: z.coerce.number().int().positive(),
  REFRESH_TOKEN_TTL: z.coerce.number().int().positive(),

  // ---- OTP / magic link ----
  OTP_TTL: z.coerce.number().int().positive(),
  OTP_LENGTH: z.coerce.number().int().min(4).max(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive(),
  MAGIC_LINK_TTL: z.coerce.number().int().positive(),
  /** Secret used to hash OTP codes/tokens at rest (>= 16 chars). */
  OTP_HASH_SECRET: z.string().min(16),

  // ---- Cookies ----
  REFRESH_COOKIE_NAME: z.string().min(1),
  COOKIE_SECURE: boolEnum,
  COOKIE_DOMAIN: z.string().optional(),

  // ---- Video uploads ----
  /** Root folder for local part/assembled files. Required when using local storage. */
  DATA_DIR: z.string().optional(),
  /** Max bytes for a single uploaded part (also the HTTP body limit). */
  UPLOAD_MAX_PART_BYTES: z.coerce.number().int().positive(),
  /** Max number of parts a single upload may declare. */
  UPLOAD_MAX_PARTS: z.coerce.number().int().positive(),
  /**
   * An unfinished upload with no activity for this many minutes is considered
   * abandoned: the reaper marks it 'expired' and deletes its temporary parts.
   * Must be positive (0 would reap freshly-created uploads).
   */
  UPLOAD_SESSION_TTL_MINUTES: z.coerce.number().positive(),
  /** Cron expression controlling how often the reaper runs. */
  UPLOAD_REAPER_CRON: z.string().min(1),
  /** 'true'/'false' — enables the abandoned-upload reaper. */
  UPLOAD_REAPER_ENABLED: boolEnum,
  /**
   * HMAC secret used to sign per-part upload URLs. Blank/absent in dev => an
   * ephemeral secret is generated at boot (URLs reset on restart). Required in
   * production; at least 16 chars when set (generate from a CSPRNG).
   */
  UPLOAD_URL_SECRET: z.union([z.literal(''), z.string().min(16)]).optional(),
  /** How long a signed part-upload URL stays valid, in seconds. */
  UPLOAD_URL_TTL_SECONDS: z.coerce.number().int().positive(),

  // ---- Object storage ----
  /**
   * If set, video parts + assembled files are stored in this S3 bucket instead
   * of the local DATA_DIR. Presence alone flips uploads from local to S3.
   */
  S3_BUCKET_NAME: z.string().optional(),
  /** Required when using S3 (enforced by the S3 storage backend). */
  AWS_REGION: z.string().optional(),
  /** Custom S3 endpoint for an S3-compatible store (MinIO, LocalStack). */
  S3_ENDPOINT: z.string().url().optional(),
  /**
   * 'true'/'false' — path-style addressing (bucket in the path), required by
   * MinIO/LocalStack. Required when using S3 (enforced by the S3 backend).
   */
  S3_FORCE_PATH_STYLE: z.enum(['true', 'false']).optional(),
  /** Blank falls back to the AWS default credential chain (env, profile, IAM role). */
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  // ---- Video thumbnails (background frame extraction via ffmpeg) ----
  /** 'true'/'false' — enables the background thumbnail sweep. */
  THUMBNAIL_SWEEP_ENABLED: boolEnum,
  /** How often the thumbnail sweep runs, in milliseconds. */
  THUMBNAIL_SWEEP_INTERVAL_MS: z.coerce.number().int().positive(),
  /** Give up on a video's thumbnail after this many failed attempts. */
  THUMBNAIL_MAX_ATTEMPTS: z.coerce.number().int().positive(),
  /** Path to the ffmpeg binary. Blank/absent => the bundled ffmpeg-static one.
   * Shared by the thumbnail and playback sweeps. */
  FFMPEG_PATH: z.string().optional(),

  // ---- Video playback (background transcode to a streamable MP4 via ffmpeg) ----
  /** 'true'/'false' — enables the background playback-transcode sweep. */
  PLAYBACK_SWEEP_ENABLED: boolEnum,
  /** How often the playback sweep runs, in milliseconds. */
  PLAYBACK_SWEEP_INTERVAL_MS: z.coerce.number().int().positive(),
  /** Give up on a video's streamable rendition after this many failed attempts. */
  PLAYBACK_MAX_ATTEMPTS: z.coerce.number().int().positive(),
  /** libx264 thread cap for the transcode — bounds CPU so a background transcode
   * can't starve the co-located API. Set to the host's spare-core budget (1 = safest). */
  PLAYBACK_FFMPEG_THREADS: z.coerce.number().int().positive(),

  // ---- Audio clips + speech-to-text ----
  /** Max bytes for a single (<=2 min) audio clip, for both the Audio and STT flows. */
  AUDIO_MAX_BYTES: z.coerce.number().int().positive(),
  /** AWS region for Transcribe (real AWS; NOT MinIO). Blank => falls back to AWS_REGION. */
  TRANSCRIBE_REGION: z.string().optional(),
  /**
   * Custom Transcribe endpoint — blank => real AWS. Set only to point at a local
   * emulator (e.g. LocalStack Pro, which is the only one that emulates Transcribe)
   * for integration testing without a real AWS account.
   */
  TRANSCRIBE_ENDPOINT: z.string().url().optional(),
  /**
   * Comma-separated AWS language candidates for IdentifyLanguage when a job gives
   * no explicit language hint, e.g. "en-GB" (add "en-US"/EU as the workforce grows;
   * AWS forbids mixing dialects of one language). See BACKEND_SPEECH_TO_TEXT_SPEC §7.
   * Must contain at least one non-blank code — a whitespace/comma-only value would
   * reduce to an empty list and make every auto-detect job fail at AWS.
   */
  TRANSCRIBE_LANGUAGE_OPTIONS: z
    .string()
    .refine((v) => v.split(',').some((c) => c.trim().length > 0), {
      message: 'must list at least one language code, e.g. "en-GB"',
    }),
  /**
   * BCP-47 language pinned when a /stt/jobs request omits `language`: the job runs
   * with LanguageCode=<this> instead of auto-detect (IdentifyLanguage). Leave UNSET
   * in production to keep auto-detect; set it (e.g. "en-US") for LocalStack, whose
   * Transcribe emulator can't identify language and would otherwise skip
   * transcription entirely. A per-request `language` always overrides this.
   */
  TRANSCRIBE_DEFAULT_LANGUAGE: z
    .string()
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'must be a BCP-47 code like en-US')
    .optional(),
});

export type Env = z.infer<typeof EnvSchema>;
