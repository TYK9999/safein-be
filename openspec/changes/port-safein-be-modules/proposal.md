## Why

`safein5-be` is an empty Nest foundation (health, realtime, SES/SNS messaging) while product features already exist in the sibling repo `safein-be`. Porting those modules here consolidates SafeIn5 backend work on the Express + Kysely stack without rewriting domain behaviour from scratch.

## What Changes

- Port domain Postgres schema from `safein-be` (identity, tenancy, signals, upload sessions, audio clips, transcription jobs) into `safein5-be`
- Port **passwordless auth**: register, OTP, magic link, refresh cookie, `/me`, global JWT guard (adapted to **Express**, not Fastify)
- Wire OTP/magic-link email through existing **`EmailService` (SES)** instead of the log-only mailer
- Port **behaviour signals**: create, mine, feed, get, supervisor acknowledge/close with display anonymity
- Port **audio clips**: S3 presign → confirm → list
- Port **STT**: S3 upload + AWS Transcribe jobs + poll/list
- Port **video uploads**: lockstep S3 multipart + ffmpeg thumbnail + playback transcode + sweeper jobs
- Port **Take 5 extract**: document ingest + Cursor Agents API → prioritized checks
- Emit realtime events for signal lifecycle where the existing Socket.IO publisher fits (create / acknowledge / close)
- Skip unwired legacy code from `safein-be` (`qrcode`, old `src/uploads`)
- **BREAKING** for local/boot: many new required env vars (JWT, S3, cookie, OTP, etc.) once modules are enabled

## Capabilities

### New Capabilities
- `passwordless-auth`: OTP + magic link login, JWT access/refresh, global guard, Community tenancy membership
- `behaviour-signals`: Capture, feed, mine, supervisor acknowledge/close, display anonymity
- `audio-clip-upload`: Presigned S3 audio clip upload and listing
- `speech-to-text`: Presign audio for Transcribe, start/poll/list jobs
- `video-multipart-upload`: Lockstep S3 multipart video upload sessions
- `video-thumbnail`: Post-upload ffmpeg poster frame + presigned GET
- `video-playback-transcode`: Post-upload H.264/AAC playback rendition + presigned GET
- `take5-extract`: Document text extraction and Cursor-backed Take 5 check generation

### Modified Capabilities

## Impact

- New Nest modules under `src/modules/` mirrored from `safein-be` (auth, signals, audio, stt, uploads, take5), adapted for Express cookies/CORS
- Expand `db/schema/schema.sql` + Kysely `Database` types from empty foundation to full domain model
- New deps: `jose`, `nestjs-zod`, S3/Transcribe SDKs, `sharp`, `ffmpeg-static`, `@nestjs/schedule`, cookie parsing for Express
- Env surface grows (JWT keys, cookie, OTP TTL, S3, Transcribe, Cursor, ffmpeg)
- Reuse existing MessagingModule for auth email; reuse RealtimePublisher for signal events
- EC2 image/host needs ffmpeg; IAM needs S3 + Transcribe (+ existing SES/SNS)
- Source of behavioural truth: `C:\Users\YaswanthK\Desktop\safein-be\src\modules` (+ its `db/schema/schema.sql`)
