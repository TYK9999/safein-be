## Context

See proposal.md — Why. The repo currently has OpenSpec + product docs and no NestJS application tree. Stack for this change: NestJS 11 + Express + Kysely/Postgres + Zod + nestjs-pino, global prefix `api`, URI version `v1`, and env via `src/config` with no silent defaults.

## Goals / Non-Goals

**Goals:**
- Bootable NestJS API with Express
- Validated env → ConfigModule wiring
- Kysely + `pg` pool lifecycle (connect on module init, destroy on shutdown)
- Health that includes DB ping
- Folder layout ready for later `src/modules/*` features
- Local Postgres via Docker Compose

**Non-Goals:**
- Auth, tenants, echoes, uploads, or any domain tables beyond a minimal bootstrap (e.g. empty schema or a single `schema_migrations`/placeholder if needed)
- Kafka / Nest microservices
- ORM (Prisma/TypeORM) — Kysely only
- Fastify adapter
- Production Kubernetes manifests beyond what Compose gives locally
- OpenAPI generation polish (can follow in a later change)

## Decisions

### 1. Express adapter (not Fastify)
- **Choice:** `@nestjs/platform-express` (Nest default)
- **Why:** Team preference for this MVP foundation; widest Nest docs/middleware ecosystem; cookie/session can still use `cookie-parser` / express middleware later
- **Alternatives:** Fastify — deferred; can revisit if performance or plugin model becomes a bottleneck

### 2. Kysely + raw SQL schema over Prisma/TypeORM
- **Choice:** Kysely query builder; `db/schema/schema.sql` as DDL source of truth; `src/database/schema.ts` for types
- **Why:** Explicit SQL, tenant-friendly query control, aligns with project data-access rules
- **Alternatives:** Prisma (migrations DX) — rejected for less control over SQL and multi-tenant query patterns; Drizzle — schema-in-TS would replace `schema.sql` as authority

### 3. Zod env schema at process start
- **Choice:** `src/config/env.schema.ts` + `configuration.ts` + `.env.example`; validate before Nest listens
- **Why:** Fail fast; no silent defaults for secrets/DB
- **Alternatives:** `@nestjs/config` alone without Zod — weaker validation

### 4. Health under `/api/v1/health`
- **Choice:** Terminus-style or thin custom controller; include `database` check via `SELECT 1`
- **Why:** Operators and Compose healthchecks need one URL; keeps versioning consistent from day one
- **Alternatives:** Unversioned `/health` — simpler for load balancers; optional later if ops requires it (can add alias without changing primary contract)

### 5. Minimal initial SQL
- **Choice:** Baseline `schema.sql` with extensions/`updated_at` helpers only (or empty documented stub) — no domain entities in this change
- **Why:** Foundation change must not invent tenant/echo models before those proposals exist
- **Alternatives:** Import full MVP schema now — deferred to domain changes

### 6. Package manager and Nest CLI
- **Choice:** Scaffold with Nest CLI (`nest new` / equivalent files) using npm unless repo already standardizes otherwise; TypeScript strict
- **Why:** Conventional Nest layout (`src/main.ts`, `app.module.ts`, `modules/`)

### 7. Logging
- **Choice:** nestjs-pino as the Nest logger
- **Why:** Structured JSON logs; convention H/S10 — no `console.log` in production code

## Risks / Trade-offs

- [Workspace rules still mention Fastify] → This change intentionally uses Express; update `.cursor/rules` in a follow-up if you want docs/rules aligned
- [Greenfield scaffold drift vs prior SafeIn5 BE] → Follow `.cursor/rules/safein5-core.mdc` paths (`src/modules`, `db/schema`, `src/config`) so later domain PRs land cleanly
- [Windows + Docker Postgres networking] → Document `localhost` vs Compose service hostname for `.env`; use published port for host-run Nest
- [Empty schema then domain migrations] → Accept; next changes own tables via kysely-schema-sync skill
- [Health coupling to DB] → Correct for MVP readiness; if liveness vs readiness split is needed later, add `/live` without removing `/ready` semantics

## Migration Plan

1. Apply scaffolding on a feature branch (`feature/initialize-nestjs-backend`)
2. Developer: copy `.env.example` → `.env`, start Compose Postgres, run migrate/apply schema SQL, `npm run start:dev`
3. Verify `GET /api/v1/health` returns ready
4. Rollback: remove app tree / Compose service; no production data yet

## Open Questions

- Whether production will use managed Postgres SSL mode flags beyond local Compose (defer; add env keys when deploying)
- Whether schema apply is raw `psql -f` for MVP vs a migration runner (assume documented `psql`/script for this change; migration tooling can be a follow-up)
