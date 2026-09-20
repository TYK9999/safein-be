## Context

See proposal.md — Why. Source behaviour lives in `C:\Users\YaswanthK\Desktop\safein-be\src\modules` with full `db/schema/schema.sql`. Target `safein5-be` already has Nest 11 + **Express**, Kysely/Postgres (empty domain schema), Zod env validation, Pino, global `MessagingModule` (SES/SNS), and Socket.IO realtime. Source uses **Fastify** + `@fastify/cookie` + Zod v4/`nestjs-zod`; this port keeps Express and adapts cookie/auth accordingly.

## Goals / Non-Goals

**Goals:**
- Behavioural API parity with safein-be modules (auth, signals, audio, stt, uploads, take5) under `/api/v1`
- Port domain schema + Kysely types; seed Community tenant id = 1
- Express-compatible refresh cookies (httpOnly, path scoped to auth)
- Auth email via existing `EmailService`
- Signal create/ack/close → `RealtimePublisher` events
- Phased implementation order inside one change: schema+auth → signals → media → take5

**Non-Goals:**
- Switching HTTP adapter to Fastify
- Porting unwired legacy (`qrcode`, old `src/uploads`)
- DB RLS / cryptographic anonymity
- Kafka/Redis (unused in source)
- Rewriting Take5 to a non-Cursor provider in this change
- Multi-tenant invite/corporate onboarding beyond Community self-join

## Decisions

### 1. Keep Express; adapt cookies
- **Choice:** `cookie-parser` (or Nest-compatible Express cookie middleware) + manual Set-Cookie for refresh tokens; mirror cookie name/path/secure/domain env from source
- **Why:** User-selected; Socket.IO adapter already Express-oriented
- **Alternatives:** Migrate entire app to Fastify — rejected

### 2. Copy schema then type Kysely
- **Choice:** Bring over safein-be `schema.sql` tables/triggers/seed; regenerate/update `src/database/schema.ts` table types
- **Why:** Single-file schema is source of truth today; avoids inventing a divergent model
- **Alternatives:** Hand-rolled subset — higher drift risk

### 3. Auth mailer = EmailService adapter
- **Choice:** Replace log `MailerService` with thin wrapper calling `EmailService.send` for OTP and magic-link templates
- **Why:** Messaging already shipped; avoids dual email stacks
- **Alternatives:** Keep log stub — fails production OTP

### 4. JWT stack from source
- **Choice:** Port `jose` EdDSA access/refresh, global `JwtAuthGuard`, `@Public` / optional JWT, membership re-check
- **Why:** Proven behaviour; claims `sub`, `email`, `tid`, `role`
- **Alternatives:** Passport JWT — unnecessary rewrite

### 5. Validation: nestjs-zod + align Zod major
- **Choice:** Introduce request Zod DTOs/`ZodValidationPipe` pattern from source; bump or dual-support Zod so env schema and DTOs compile cleanly (prefer one Zod major across the repo during port)
- **Why:** Source modules depend on it; ad-hoc validation would diverge
- **Alternatives:** class-validator — inconsistent with source and messaging Zod

### 6. Media AWS clients
- **Choice:** Add S3 + presigner + Transcribe SDK clients; shared S3 factory; Transcribe requires real AWS (or LocalStack Pro), not MinIO
- **Why:** Matches source contracts
- **Alternatives:** Abstract storage interface — out of scope

### 7. ffmpeg on host / Docker image
- **Choice:** `ffmpeg-static` or `FFMPEG_PATH`; ensure prod Dockerfile installs ffmpeg; thread caps from source env
- **Why:** Thumbnail + playback require local ffmpeg
- **Alternatives:** External media worker — future hardening

### 8. Signals + realtime
- **Choice:** After successful create/ack/close, publish via existing `RealtimePublisher` (notification and/or tenant room event; document event names in `docs/realtime.md`)
- **Why:** safein5 already has Socket.IO; source was pull-only
- **Alternatives:** Poll-only parity — weaker UX on SIGNAL

### 9. Take5 remains Cursor Agents + sandbox docs path
- **Choice:** Port as-is; sandbox under `docs/learn-take-rescue` (or config); public endpoint retained with AI_NOT_CONFIGURED when key missing
- **Why:** Behavioural parity; auth gate deferred
- **Alternatives:** Require JWT — product decision later

### 10. Error and health conventions
- **Choice:** Keep safein5 `/api/v1/health`; map module errors to existing Nest HTTP exceptions / `{ code, message }` style from source where present
- **Why:** Deploy probes already use `/api/v1/health`
- **Alternatives:** Add `/healthz` aliases — optional later

## Risks / Trade-offs

- [Large env surface] → Extend Zod env carefully; document in `.env.example`; fail fast at boot
- [Zod v3 vs v4] → Resolve during dependency task; avoid mixed APIs
- [Cookie + CORS credentials] → Configure `CORS` origins + `credentials` for auth cookie flows; coordinate with Socket CORS env
- [ffmpeg CPU on API host] → Cap threads; document EC2 sizing; eventual queue out of scope
- [Anonymous media capability tokens] → Treat session_token / STT jobId as secrets; no listing by guessing
- [Signal anonymity display-only] → Document audit visibility for supervisors/DBAs
- [Public Take5 cost/latency] → Document timeouts; consider rate limits as follow-up
- [Schema apply destroys empty DB assumption] → apply with `psql -f db/schema/schema.sql` (recreate-oriented); warn before wipe in shared envs

## Migration Plan

1. Add deps + env keys + schema SQL + Kysely types; apply on empty/dev DB
2. Port auth + wire SES mailer + Express cookies + global guard
3. Port signals + realtime hooks
4. Port audio + stt + uploads (+ Dockerfile ffmpeg)
5. Port take5 + docs updates
6. Run unit tests from source (adapted) + smoke critical paths
7. Rollback: revert deploy; schema rollback is drop/recreate in current model (no forward migrations yet)

## Open Questions

- Exact realtime event names/payloads for signals (extend existing notification channel vs dedicated `signal.updated`) — finalize during signals task without changing REST specs
- Whether Take5 should stay public long-term — product follow-up, not blocking port
