# AGENTS.md — SafeIn5 Backend

Guidance for Cursor (and other coding agents) working in this repository.

## Project

SafeIn5 API (`safein5`) — NestJS 11 modular monolith on **Fastify**, with **Kysely + Postgres**, **Zod / nestjs-zod**, **nestjs-pino**, passwordless OTP auth (EdDSA JWT via `jose`), AWS S3 (MinIO/LocalStack locally), and AWS Transcribe for STT.

- Global prefix: `api` + URI versioning `v1` → `/api/v1/...`
- Unversioned: `/healthz`, `/readyz`
- Live features live under `src/modules/*` only

## Commands

```bash
npm install
npm run start:dev      # watch mode
npm run build
npm run lint
npm run typecheck
npm test               # unit tests (Jest, rootDir=src)
npm run test:e2e
```

Local infra: `docker compose up -d` (Postgres + MinIO; LocalStack via compose profile when needed). Copy `.env.example` → `.env` (no secrets in git).

## Authoritative sources

| Topic | Source of truth |
|-------|-----------------|
| Live SQL schema | `db/schema/schema.sql` |
| Kysely types | `src/database/schema.ts` (must match live SQL) |
| Env validation | `src/config/env.schema.ts` + `configuration.ts` + `.env.example` |
| Architecture / phases | `docs/SafeIn5-Backend-Plan.md`, `docs/SafeIn5-MVP-Architecture.md`, `docs/SafeIn5-Backend-Phase-*.md` |
| Upload / audio / STT contracts | `docs/md/BACKEND_UPLOAD_SPEC.md`, `api/BACKEND_*_SPEC.md` |
| Future RLS migrations | `docs/db/migrations/` (not applied yet — do not treat as live) |

Root `README.md` is Nest starter boilerplate — prefer the docs above.

## Hard constraints

1. **New features** go in `src/modules/<name>/`. Do **not** revive legacy `src/qrcode/` or `src/uploads/` (excluded from `AppModule` on purpose).
2. **No Kafka / Nest microservices** for MVP. Async work = `@nestjs/schedule` sweepers or the planned transactional outbox — not brokers (`kafkajs` in package.json is unused).
3. **No silent env defaults.** Every new var: `env.schema.ts` → `configuration.ts` → `.env.example`.
4. **Auth imports** come from `src/modules/auth/` (never invent `identity/`).
5. **Tenant data** queries always filter by `tenant_id`.
6. **Browser media** uploads use presigned S3 URLs; the API must not proxy media bytes.
7. **Logging:** use `AppLoggerService` / nestjs-pino; never log OTP, tokens, emails, or request bodies.

## Module layout (canonical)

```
src/modules/<feature>/
  <feature>.module.ts
  <feature>.controller.ts      # @Controller({ version: '1' }), thin
  <feature>.service.ts         # @Inject(APP_DB) Kysely<DB>
  <feature>.schema.ts          # Zod + createZodDto
  *.workflow.ts / *.present.ts # pure domain helpers when needed
  tests/*.spec.ts
```

Wire the module in `src/app.module.ts`.

## Auth modes

| Mode | How |
|------|-----|
| Authenticated (default) | Global `JwtAuthGuard` — send Bearer |
| Public | `@Public()` |
| Optional / guest | `@Public()` + `@UseGuards(OptionalJwtGuard)` + `@OptionalUser()` |

Do not trust JWT `role` alone — membership/role is re-checked from the DB in the guard pattern.

## Errors

- Domain (signals, auth, QR admin): Nest HTTP exceptions (`BadRequestException`, `NotFoundException`, …).
- Media / upload / audio / STT: `{ code, message }` via `fail(status, code, message)` → `HttpException`.

## Cursor enforcement

Project rules: `.cursor/rules/*.mdc`  
Project skills: `.cursor/skills/*/SKILL.md`  
Project MCP: `.cursor/mcp.json`

Read and follow those when editing this repo. Prefer skills for multi-step workflows (new module, env change, schema sync, API spec implementation).
