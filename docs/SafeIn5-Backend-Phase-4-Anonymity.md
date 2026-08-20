# Phase 4 — Anonymous reporting

A worker can capture a signal without their name attached. SafeIn5's core
premise is safe, blame-free reporting, so this is central — and small: one
column plus conditional serialization.

**Verified:** `nest build` ✅ · `tsc` ✅ · unit tests 26/26 ✅ · **live end-to-end** ✅
(anonymous → `author: null`; named → author shown; feed masks correctly).

## Scope — display-level, not yet cryptographic

When `is_anonymous` is true, the API returns `author: null` in **every** read
path (create response, feed, my-signals, get-by-id). But `author_user_id` is
still stored in the row, so an admin with DB access could de-anonymise.

Full pseudonymity — where even the database cannot link a signal to a person —
is the later **tenancy phase**: it replaces `author_user_id` with a one-way
`author_token` (HMAC per user per tenant). That schema already exists for
reference in `docs/db/migrations/`. This phase is the honest, incremental first
step and the API shape (`author: null` + `isAnonymous`) does not change when the
storage is hardened later.

## Schema — `db/schema/04_anonymity.sql`

`signal.is_anonymous boolean NOT NULL DEFAULT false`.

```bash
psql -U postgres -d safein -v ON_ERROR_STOP=1 -f db/schema/04_anonymity.sql
```

## API change

`POST /api/v1/signals` accepts an optional `"anonymous": true` (default false).
Every signal view now includes `isAnonymous`, and `author` is `null` when the
signal is anonymous:

```jsonc
{ "id": "...", "classification": "be_aware", "bodyText": "...",
  "status": "open", "isAnonymous": true, "author": null, ... }
```

Masking is a pure function (`signal.present.ts`, unit-tested) applied uniformly,
so no read path can accidentally leak an anonymous author.

## Deferred

Cryptographic pseudonymity (`author_token`), per-user anonymity default,
and letting a reporter reveal themselves later.
