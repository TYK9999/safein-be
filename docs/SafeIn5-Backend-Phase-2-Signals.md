# Phase 2 — Behaviour Signals (capture + feed)

A logged-in user records a safety observation (a "signal") with a classification;
everyone sees the feed. Deliberately simple — one table, attributed authorship.

**Verified:** `nest build` ✅ · `tsc` ✅ · unit tests 14/14 ✅ · **live end-to-end** ✅
(capture → feed → my-signals → by-id, plus 401 no-token / 400 bad-classification / 400 bad-uuid).

## Schema — `db/schema/02_signals.sql`

`signal` = `id`, `author_user_id` → `app_user`, `classification`
(`good_practice | be_aware | needs_attention_now`, CHECK), `body_text`, `created_at`.
Indexes for the feed (`created_at desc`) and my-signals (`author, created_at desc`).

Run it (after `01_init.sql`):
```bash
psql -U postgres -d safein -v ON_ERROR_STOP=1 -f db/schema/02_signals.sql
```

## Endpoints (under `/api/v1`, all require a bearer token)

| Method · Path | Purpose |
|---|---|
| `POST /signals` | capture a signal `{ classification, bodyText }` |
| `GET  /feed?limit=` | all signals, newest first (default 50, max 100) |
| `GET  /signals/mine?limit=` | the caller's own signals |
| `GET  /signals/:id` | one signal (400 on bad UUID, 404 if missing) |

Each returns `{ id, classification, bodyText, createdAt, author: { id, displayName } }`.

## Deferred to later phases

Anonymity (author hidden / `author_token`), tenant + site scoping (right now the
feed is global), media attachments, PULSE linkage, classification as editable
reference data, supervisor acknowledge/close, and keyset pagination.
