# Database

Local development uses a **host-installed Postgres 16+** (this machine already has PostgreSQL 16).

Do **not** run Postgres via Docker for local work. `docker-compose.prod.yml` is for server deploy only.

## Setup

1. Ensure the service is running (`postgresql-x64-16` on Windows).
2. Set `DATABASE_URL` in `.env`, for example:

```text
postgresql://postgres:<password>@localhost:5432/safein5
```

3. Create the database once (as a superuser):

```bash
psql -U postgres -c "CREATE DATABASE safein5;"
```

4. Apply schema. Either **all tables at once**, or **phase 1** (sign-in only):

Full schema:

```bash
psql -U postgres -d safein5 -v ON_ERROR_STOP=1 -f db/schema/schema.sql
```

Phase 1 only — one self-contained file (tables + platform admin user). Works in pgAdmin Query Tool or psql:

```bash
psql -U postgres -d safein5 -v ON_ERROR_STOP=1 -f db/phases/01-platform-admin.sql
```

To use another inbox, edit `v_admin_email` in the seed block at the bottom of that file.

Then `POST /api/v1/auth/otp/request` and `POST /api/v1/auth/otp/verify` with that email. Do not seed `auth_token` — the API writes the hashed OTP when you request it.

Later phases add the remaining `db/schema/*.sql` files. Do not run `schema.sql` on a database that already has phase 1 applied (objects will already exist). Drop/recreate the DB to reset.

Schema source of truth: `db/schema/`. Apply **`schema.sql`** only when you want everything — it `\ir`s the domain files (identity, tenancy, access, hazard, documents, content, work tasks, PULSE, Echoes, realtime, media, triggers). Use `\ir` so includes resolve next to `schema.sql` even when you run `psql -f` from the repo root.

Identity: `app_user.account_status` is `invited` until the first successful email OTP, then `active`. `auth_token.kind` is OTP only (no magic-link tokens).

Applying again on a non-empty DB may fail on existing objects — drop/recreate the DB to reset.

## PWA MVP data model

The PWA flows in `docs/pwa/` use these tables:

- `pulse` stores a worker journey started from a QR scan, task, or observation,
  including lifecycle status and current stage.
- `pulse_event` records pause/resume, Learn 5, Shift, checklist, stop, share,
  and acknowledgement events. `reason_code`, `reason_text`, and notification
  fields support the “work cannot proceed” flow.
- `pulse_checklist_response` stores one answer and optional comment for each
  content prompt in a PULSE. This is separate from the reusable prompt text.
- `pulse_content_acknowledgement` stores viewed, acknowledged, or skipped
  rescue-plan, Learn 5, and contextual guidance items.
- `signal_media` stores direct captured media metadata for photos and other
  media, while retaining links to chunked video, audio, and transcription
  records.
- `realtime_connection` / `realtime_connection_room` record Socket.IO
  `/realtime` presence (worker vs back office, rooms, disconnect).
- `realtime_message` stores published Echo / PULSE / notification / signal
  events for audit (not a substitute for the live socket).

The exports define the screens and states but do not define an offline queue,
conflict policy, profile/settings model, or notification-center contract. Those
remain implementation decisions and are intentionally not represented in this
schema update.

## Historic job-pack seed

The initial Tarmac / Dolyhir historic pack extracted from `docs/extraction/`
can be loaded after the schema:

```bash
psql -U postgres -d safein5 -v ON_ERROR_STOP=1 -f db/seed/historic-job-pack.sql
```

The seed is rerunnable and remains draft/unpublished. Review the matching
`docs/extraction/SafeIn5_Historic_Job_Pack_Seed_Review.xlsx` workbook first;
the source set is missing IMSF 100 page 4 and the original HIRA, permit,
method-statement and rescue-plan files.

## Sample-documents job-pack seed

Photographed originals in `docs/sample documents/` (HIRA, PTW 098001, rescue
plan, IMSF 100 pages 1–3, contractor clearance) can be loaded after schema:

```bash
psql -U postgres -d safein5 -v ON_ERROR_STOP=1 -f db/seed/sample-job-pack.sql
```

Regenerate SQL and the mapping workbook together:

```bash
node scripts/generate-sample-job-pack.mjs
```

Workbook: `docs/sample documents/SafeIn5_Sample_Documents_Seed_Map.xlsx`.
The `STILL_NEEDED` sheet lists website fields this pack cannot fill.
