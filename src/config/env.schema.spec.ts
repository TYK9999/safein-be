import { parseEnv } from './env.schema';

describe('parseEnv', () => {
  const valid = {
    NODE_ENV: 'test',
    PORT: '3000',
    APP_URL: 'http://localhost:3000',
    DATABASE_URL: 'postgresql://safein5:safein5@localhost:5432/safein5',
    LOG_LEVEL: 'info',
    SOCKET_IO_CORS_ORIGINS: 'http://localhost:5173,http://localhost:3001',
    AWS_REGION: 'ap-south-1',
    SES_FROM_EMAIL: 'noreply@example.com',
    JWT_ISSUER: 'safein5',
    ACCESS_TOKEN_TTL: '900',
    REFRESH_TOKEN_TTL: '2592000',
    OTP_TTL: '600',
    OTP_LENGTH: '6',
    OTP_MAX_ATTEMPTS: '5',
    OTP_HASH_SECRET: 'test-otp-hash-secret',
    REFRESH_COOKIE_NAME: 'safein5_rt',
    COOKIE_SECURE: 'false',
    UPLOAD_MAX_PART_BYTES: '20971520',
    UPLOAD_MAX_PARTS: '10000',
    UPLOAD_SESSION_TTL_MINUTES: '1440',
    UPLOAD_REAPER_CRON: '0 * * * *',
    UPLOAD_REAPER_ENABLED: 'false',
    UPLOAD_URL_TTL_SECONDS: '900',
    S3_BUCKET_NAME: 'safein5-dev',
    S3_FORCE_PATH_STYLE: 'false',
    THUMBNAIL_SWEEP_ENABLED: 'false',
    THUMBNAIL_SWEEP_INTERVAL_MS: '15000',
    THUMBNAIL_MAX_ATTEMPTS: '3',
    PLAYBACK_SWEEP_ENABLED: 'false',
    PLAYBACK_SWEEP_INTERVAL_MS: '15000',
    PLAYBACK_MAX_ATTEMPTS: '3',
    PLAYBACK_FFMPEG_THREADS: '1',
    AUDIO_MAX_BYTES: '26214400',
    TRANSCRIBE_LANGUAGE_OPTIONS: 'en-GB',
  };

  it('accepts a valid environment', () => {
    const env = parseEnv(valid);
    expect(env.PORT).toBe(3000);
    expect(env.DATABASE_URL).toContain('postgresql://');
    expect(env.SOCKET_IO_CORS_ORIGINS).toEqual([
      'http://localhost:5173',
      'http://localhost:3001',
    ]);
    expect(env.AWS_REGION).toBe('ap-south-1');
    expect(env.SES_FROM_EMAIL).toBe('noreply@example.com');
    expect(env.SNS_SMS_TYPE).toBe('Transactional');
    expect(env.JWT_ISSUER).toBe('safein5');
    expect(env.S3_BUCKET_NAME).toBe('safein5-dev');
  });

  it('rejects missing DATABASE_URL', () => {
    expect(() =>
      parseEnv({
        ...valid,
        DATABASE_URL: undefined,
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it('rejects non-postgres DATABASE_URL', () => {
    expect(() =>
      parseEnv({
        ...valid,
        DATABASE_URL: 'mysql://localhost/db',
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it('rejects missing PORT (no silent default)', () => {
    expect(() =>
      parseEnv({
        ...valid,
        PORT: undefined,
      }),
    ).toThrow(/PORT/);
  });

  it('rejects missing SOCKET_IO_CORS_ORIGINS', () => {
    expect(() =>
      parseEnv({
        ...valid,
        SOCKET_IO_CORS_ORIGINS: undefined,
      }),
    ).toThrow(/SOCKET_IO_CORS_ORIGINS/);
  });

  it('rejects * CORS origins in production', () => {
    expect(() =>
      parseEnv({
        ...valid,
        NODE_ENV: 'production',
        SOCKET_IO_CORS_ORIGINS: '*',
      }),
    ).toThrow(/SOCKET_IO_CORS_ORIGINS/);
  });

  it('rejects missing AWS_REGION', () => {
    expect(() =>
      parseEnv({
        ...valid,
        AWS_REGION: undefined,
      }),
    ).toThrow(/AWS_REGION/);
  });

  it('rejects short OTP_HASH_SECRET', () => {
    expect(() =>
      parseEnv({
        ...valid,
        OTP_HASH_SECRET: 'short',
      }),
    ).toThrow(/OTP_HASH_SECRET/);
  });

  it('normalizes LOG_LEVEL case', () => {
    const env = parseEnv({
      ...valid,
      LOG_LEVEL: 'DEBUG',
    });
    expect(env.LOG_LEVEL).toBe('debug');
  });
});
