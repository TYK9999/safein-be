# Phase 3 — Supervisor loop (acknowledge & close)

Closes SafeIn5's core loop: a supervisor acknowledges a signal, then closes it
with a note. Introduces the first authorization — a minimal `role`
(`worker | supervisor`) — and a status lifecycle on signals.

**Verified:** `nest build` ✅ · `tsc` ✅ · unit tests 21/21 ✅ · **live end-to-end** ✅
(worker 403 → supervisor acknowledge → close with note → 409 on re-close; `?status` filter).

## Schema — `db/schema/03_supervisor.sql`

- `app_user.role` — `worker | supervisor` (CHECK), default `worker`.
- `signal` gains `status` (`open | acknowledged | closed`, default `open`),
  `acknowledged_at/by`, `closed_at/by`, `close_note`, and an index on `status`.

Run it (after `02_signals.sql`):
```bash
psql -U postgres -d safein -v ON_ERROR_STOP=1 -f db/schema/03_supervisor.sql
```

Make a supervisor (there is no admin UI yet):
```sql
UPDATE app_user SET role = 'supervisor' WHERE email = 'boss@example.com';
```
The role is read at login, so the user must log in **after** this to get a token
whose `role` is `supervisor`. `role` now travels in the access token and in `/me`.

## Endpoints (added, under `/api/v1`, bearer token)

| Method · Path | Who | Rule |
|---|---|---|
| `POST /signals/:id/acknowledge` | supervisor | `open → acknowledged` (idempotent); `closed` → 409; worker → 403 |
| `POST /signals/:id/close` | supervisor | `open/acknowledged → closed`, `{ closeNote }` required; re-close → 409 |
| `GET  /feed?status=open\|acknowledged\|closed` | any | filter the feed by status |

Signal views now include `status`, `acknowledgedAt`, `closedAt`, `closeNote`.

## Deferred to later phases

Real role management (admin UI / invitations), site-scoped supervision (a
supervisor only sees their sites), reopen, notifications to the reporter on
closure, and anonymity.
