# Domain modules (ported from safein-be)

HTTP prefix: `/api/v1`. Express + cookie-parser; credentialed CORS from `corsOrigins` (defaults to `SOCKET_IO_CORS_ORIGINS`).

## Auth (`passwordless-auth`)

| Method | Path | Auth |
|--------|------|------|
| POST | `/auth/register` | Public — creates invited user, emails OTP |
| POST | `/auth/otp/request` | Public |
| POST | `/auth/otp/verify` | Public → first OTP activates the user; access JWT + httpOnly refresh cookie (`path=/api/v1`) |
| POST | `/auth/refresh` | Refresh cookie → new access JWT + rotated refresh cookie |
| POST | `/auth/logout` | Clears cookie |
| GET | `/me` | Bearer (or refresh cookie if the access token expired) |

Sign-up, invite, and sign-in all use email OTP (no magic link). OTP email goes through SES (`EmailService`). Set JWT keys in production; blank keys mint an ephemeral EdDSA pair in non-prod.

**Session:** The access token is short-lived and sent as `Authorization: Bearer`. Keep the refresh cookie with `credentials: 'include'`. When the access token expires, permissioned APIs still succeed if the refresh cookie is valid: the server mints a new access token, sets a new refresh cookie, and returns the new access token in `X-Access-Token` (replace the stored Bearer). The client should not send the user through OTP again until the refresh cookie itself expires (`REFRESH_TOKEN_TTL`, default 30 days) or they log out.

## Signals

Authenticated member create / mine / feed / get; supervisor acknowledge / close. Anonymous signals hide author in API responses. Emits Socket.IO `signal.updated` to `tenant:{id}`.

## Audio / STT / Uploads

Require `S3_BUCKET_NAME` + AWS credentials or instance role. Optional JWT (guest → Community tenant).

- Audio: `/audio-clips/presign`, `/confirm`, list
- STT: `/stt/presign`, `/stt/jobs`, poll by job id (AWS Transcribe; not MinIO)
- Video: `/uploads/next` lockstep multipart; `/uploads/:token/thumbnail` and `/playback`

Prod image installs **ffmpeg** (`Dockerfile`). Override with `FFMPEG_PATH` if needed. Configure S3 lifecycle `AbortIncompleteMultipartUpload` for abandoned multipart uploads.

## Take 5

`POST /take5/extract` (public). Sandbox file reads under `docs/learn-take-rescue` only. Needs `CURSOR_API_KEY` or returns AI not configured.

## IAM (typical)

- `ses:SendEmail` / SNS publish (messaging)
- `s3:PutObject`, `GetObject`, `HeadObject`, multipart APIs on the media bucket
- `transcribe:StartTranscriptionJob`, `GetTranscriptionJob`

See `.env.example` for the full env surface.
