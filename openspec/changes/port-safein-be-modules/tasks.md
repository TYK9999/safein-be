## 1. Dependencies and shared HTTP



- [x] 1.1 Add npm deps needed for port (`jose`, `nestjs-zod`, S3/presigner/Transcribe SDKs, `sharp`, `ffmpeg-static`, `@nestjs/schedule`, Express `cookie-parser` / types) and resolve Zod major alignment with existing env schema

- [x] 1.2 Extend Zod env schema + `.env.example` for JWT, cookies, OTP/magic TTL, S3, Transcribe, upload limits, ffmpeg, Cursor keys (fail-fast; document optional vs required)

- [x] 1.3 Map new config keys in `configuration.ts`

- [x] 1.4 Add global Zod validation pipe and Express cookie middleware in `main.ts` / AppModule wiring (CORS credentials for auth cookie origins)



## 2. Domain schema



- [x] 2.1 Port domain tables/triggers/Community seed from `safein-be` `db/schema/schema.sql` into this repo's schema file

- [x] 2.2 Update Kysely `Database` / table types to match the ported schema

- [x] 2.3 Schema apply is manual via `psql -f db/schema/schema.sql` (no npm script); documented in `db/README.md`



## 3. Passwordless auth



- [x] 3.1 Port auth module (schemas, crypto, JWT service, guards, decorators, controller/service) adapted for Express cookies

- [x] 3.2 Replace log mailer with `EmailService` adapter for OTP and magic-link emails (no OTP/secret info logs)

- [x] 3.3 Register AuthModule, apply global JWT guard, export optional-JWT guard for media

- [x] 3.4 Port/adapt auth unit tests (crypto + critical service paths)



## 4. Behaviour signals + realtime



- [x] 4.1 Port signals module (workflow, present/anonymity, controller, service, schemas)

- [x] 4.2 Emit realtime events on create / acknowledge / close via `RealtimePublisher`; document event names in `docs/realtime.md`

- [x] 4.3 Port/adapt signal workflow and anonymity tests



## 5. Audio and STT



- [x] 5.1 Port audio module (presign / confirm / list) with shared S3 helper and optional JWT

- [x] 5.2 Port STT module (presign, start job, poll/list) with Transcribe client

- [x] 5.3 Port/adapt audio and STT unit tests with mocked AWS clients



## 6. Video upload, thumbnail, playback



- [x] 6.1 Port uploads multipart lockstep flow (`/uploads/next`) + session schema usage

- [x] 6.2 Port thumbnail generation + sweeper + GET thumbnail URL

- [x] 6.3 Port playback transcode + sweeper + GET playback URL; wire `@nestjs/schedule`

- [x] 6.4 Ensure Dockerfile / prod image includes ffmpeg (or documented `FFMPEG_PATH`)

- [x] 6.5 Port/adapt uploads util/schema tests



## 7. Take 5 extract



- [x] 7.1 Port take5 module (extract, files sandbox, Cursor client, controller/service)

- [x] 7.2 Confirm sandbox root points at `docs/learn-take-rescue` (or config) and path traversal is rejected

- [x] 7.3 Port/adapt take5 unit tests (mock Cursor where needed)



## 8. Docs and verification



- [x] 8.1 Document module APIs, env, S3 lifecycle, IAM, and ffmpeg prerequisites (README and/or `docs/`)

- [x] 8.2 Wire all new modules in `AppModule`; run lint, unit tests, and build

- [ ] 8.3 Smoke-check critical paths locally where credentials allow (auth OTP email stub/SES, health still green)

