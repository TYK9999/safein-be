# SafeIn5 Backend

NestJS 11 + Express + PostgreSQL (Kysely) API foundation.

**Requires Node.js >= 20.**

## Quick start

1. Copy env and point `DATABASE_URL` at your **local Postgres** (port **5432** by default):

```bash
cp .env.example .env
# Edit DATABASE_URL — replace YOUR_PASSWORD (and user/db if needed)
```

Create the database if it does not exist yet (example using the `postgres` superuser):

```bash
psql -U postgres -c "CREATE DATABASE safein5;"
```

Local Docker Postgres is **not** used for development. Production packaging still uses `docker-compose.prod.yml` on the server.

2. Install dependencies:

```bash
npm install
```

Apply the schema yourself with `psql` (see [db/README.md](db/README.md)).

3. Run the API:

```bash
npm run start:dev
```

4. Health check:

```bash
curl http://localhost:3000/api/v1/health
```

Expected when DB is up:

```json
{"status":"ok","checks":{"process":"up","database":"up"}}
```

If Postgres is stopped after the app is running, the same endpoint returns HTTP 503 with `"database":"down"`.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run start:dev` | Watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run compiled app |
| `npm test` | Unit tests |
| `npm run lint` | ESLint |

## Layout

- `src/config` — Zod env validation + Nest ConfigModule
- `src/database` — Kysely + `pg` pool
- `src/modules` — feature modules
- `db/schema/` — SQL source of truth (`schema.sql` includes the rest; apply with `psql`; see [db/README.md](db/README.md))

## Realtime

Socket.IO namespace `/realtime` for worker + SIGNAL (Echo queue, PULSE, notifications).  
See [docs/realtime.md](docs/realtime.md).

## Messaging (email / SMS)

AWS SES + SNS via injectable `EmailService` / `SmsService`.  
See [docs/messaging.md](docs/messaging.md).

## Domain modules

Auth, signals, audio, STT, video uploads, and Take 5 (ported from `safein-be`, Express-adapted).  
See [docs/domain-modules.md](docs/domain-modules.md).

## Postman

Import [`postman/SafeIn5-API.postman_collection.json`](postman/SafeIn5-API.postman_collection.json) and the Local environment to exercise all `/api/v1` routes (auth flow included).  
See [docs/postman.md](docs/postman.md).

## Logging and errors

Central `AppLoggerService`, `LOG_LEVEL`, request ids, and global API error shape.  
See [docs/logging.md](docs/logging.md).

## CI/CD (EC2 over SSH, no ECR)

**Current scope: `dev` only** (qa / stage / demo deferred).

| Trigger | Workflow | Effect |
|---------|----------|--------|
| PR → `dev` | `ci.yml` | lint, test, build |
| Push → `dev` | `deploy.yml` | quality gates, rsync to dev EC2, on-host Docker build/restart, health check |

Ops checklist (EC2 prerequisites, GitHub Environment `dev` secrets, rollback): [docs/ops/cicd-ec2.md](docs/ops/cicd-ec2.md).

Production Compose on the host: `docker compose -f docker-compose.prod.yml up -d --build`.
