## 1. Project scaffold

- [x] 1.1 Create NestJS 11 TypeScript app in repo root (`package.json`, `tsconfig`, `nest-cli.json`, `src/main.ts`, `src/app.module.ts`) with Express adapter
- [x] 1.2 Add scripts: `build`, `start`, `start:dev`, `lint`, `test` (and document Node version if needed)
- [x] 1.3 Create folder layout: `src/config`, `src/database`, `src/modules`, `db/schema` (empty modules placeholder ok)

## 2. Configuration

- [x] 2.1 Add Zod `env.schema.ts` covering NODE_ENV, PORT, DATABASE_URL (or discrete PG host/port/user/password/db), LOG_LEVEL—no silent defaults for secrets or DB
- [x] 2.2 Wire `configuration.ts` + Nest ConfigModule; fail boot when validation fails
- [x] 2.3 Add `.env.example` with all required keys and placeholders; ensure `.env` is gitignored

## 3. PostgreSQL and Kysely

- [x] 3.1 Add Docker Compose Postgres service with published port and documented credentials matching `.env.example`
- [x] 3.2 Add baseline `db/schema/schema.sql` (extensions/helpers only; no domain tables)
- [x] 3.3 Add `src/database/schema.ts` Kysely Database interface aligned with baseline SQL
- [x] 3.4 Implement DatabaseModule: create `pg` pool + Kysely instance from config; destroy pool on shutdown
- [x] 3.5 Document applying schema locally (e.g. `psql -f db/schema/schema.sql` or npm script wrapper)

## 4. HTTP API runtime

- [x] 4.1 Configure Express bootstrap: global prefix `api`, URI versioning `v1`, nestjs-pino logger (no request body / secrets in logs)
- [x] 4.2 Add Health module/controller at `GET /api/v1/health` with process + `SELECT 1` database check (success vs not-ready statuses)
- [x] 4.3 Wire AppModule imports: Config, Logger, Database, Health

## 5. Verification

- [x] 5.1 Add focused tests for env validation failure and health ready/unready behavior (unit or e2e as practical)
- [x] 5.2 Manually verify: Compose up → apply schema → copy `.env` → `start:dev` → health returns ready; stop DB → health not ready
- [x] 5.3 Confirm `npm run build` succeeds and README (or short docs note) covers local run steps for this foundation
