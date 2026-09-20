## Why

SafeIn5 has product docs and an HTML MVP prototype, but no runnable NestJS backend yet. We need a solid application foundation—HTTP server, validated configuration, and PostgreSQL access—before domain features (auth, echoes, tasks, content) can be built.

## What Changes

- Scaffold a NestJS 11 application using Express as the HTTP adapter
- Add Zod-validated environment configuration with no silent defaults (`.env.example` as the documented contract)
- Wire PostgreSQL via Kysely with typed schema hooks and boot-time connectivity checks
- Establish global API conventions: prefix `api`, URI versioning `v1`, structured logging (nestjs-pino)
- Add a health endpoint that reports process and database readiness
- Add local Docker Compose Postgres (and optional tooling layout: `db/schema`, `src/modules`, `src/config`, `src/database`)
- Baseline scripts for build, start, test, and lint so apply work has a clear quality gate

## Capabilities

### New Capabilities
- `http-api`: NestJS Express HTTP surface—boot, global prefix/versioning, health route, logging, error shape baseline
- `config`: Environment loading and Zod validation for all required runtime settings
- `database`: PostgreSQL connectivity via Kysely, schema source of truth, and DB health participation

### Modified Capabilities

## Impact

- Greenfield NestJS project under `src/` (currently absent)
- New npm dependencies: NestJS, Express adapter, Kysely, `pg`, Zod/nestjs-zod, nestjs-pino, config modules
- New `docker-compose` (or equivalent) for local Postgres
- New `db/schema/schema.sql` and `src/database/schema.ts` stubs aligned for later domain migrations
- No domain APIs (auth, echoes, uploads) in this change—foundation only
