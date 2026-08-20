# Phase 5 — Tenancy foundation

Introduces organisations (tenants) and per-tenant memberships, and scopes every
signal to a tenant. This is the structural foundation; DB-level enforcement and
cryptographic pseudonymity are explicit follow-on sub-phases (see below).

**Verified:** `nest build` ✅ · `tsc` ✅ · unit tests 26/26 ✅ · **live 2-tenant isolation** ✅.

## What changed

- **`tenant`** — organisations. A seeded **Community** org (fixed id) that
  self-registration joins. `kind` = `community | corporate`.
- **`user_tenant_membership`** — person × org, and **role now lives here**
  (`worker | supervisor`), because role is per-organisation.
  `app_user.role` was dropped.
- **`signal.tenant_id`** — every signal belongs to a tenant.
- **JWT** now carries `tid` (tenant) alongside `role`; `/me` returns the tenant.
- **Every signals query is scoped** to the caller's tenant: feed, my-signals,
  get-by-id, acknowledge, close. A signal in another tenant is **not found**
  (404) — you can't read it, acknowledge it, or close it.

## Scope enforcement — application layer (for now)

Scoping is a `WHERE tenant_id = :tid` on every query, with `:tid` taken from the
verified JWT. This is correct and testable, but it relies on the application
never forgetting the predicate. **Database-level RLS** (Postgres refusing
cross-tenant rows even if a query forgets the filter) is the next hardening
sub-phase; the full RLS design is in `docs/db/migrations/`.

## Schema — `db/schema/05_tenancy.sql`

Creates `tenant` + `user_tenant_membership`, seeds Community, then **backfills**
existing data: every existing user gets a Community membership carrying their
old role, and every existing signal is assigned to Community. Safe to run once on
a phase 1-4 database.

```bash
psql -U postgres -d safein -v ON_ERROR_STOP=1 -f db/schema/05_tenancy.sql
```

Make a supervisor (role is on the membership now), then that user must re-login:
```sql
UPDATE user_tenant_membership m SET role = 'supervisor'
  FROM app_user u WHERE u.id = m.user_id AND u.email = 'boss@example.com';
```

## Verified live (2 tenants: Community + Acme)

- sam (Community) and alice (Acme) each see only their own tenant's feed.
- alice `GET` of sam's signal → 404; alice (Acme supervisor) acknowledging sam's
  Community signal → 404; boss (Community supervisor) → 200.
- `/me` returns the correct tenant for each; the JWT carries the right `tid`/`role`.

## Deferred (own sub-phases)

Database-level RLS enforcement; cryptographic pseudonymity (replace
`author_user_id` with a one-way `author_token` so even the DB can't link a signal
to a person); invitation-based joining of corporate orgs; belonging to multiple
orgs + switching between them; org admin management.
