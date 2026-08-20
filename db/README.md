# Database — manual setup

All SQL lives here (never under `src/`). You run it yourself with `psql`; the
app does **not** apply it.

`schema/schema.sql` is the **whole schema in one file** (clean `CREATE TABLE`s,
no migrations). The workflow is drop-and-recreate: to change the schema, edit
`schema.sql`, then drop the database and re-run it.

## Set up locally

```bash
# create the database once (your local Postgres 16)
createdb safein                        # or: psql -U postgres -c 'CREATE DATABASE safein;'

# run the whole schema
psql -U postgres -d safein -v ON_ERROR_STOP=1 -f db/schema/schema.sql
```

Then copy `.env.example` to `.env`, point `DATABASE_URL` at your `safein`
database, and `npm run start:dev`.

## Reset (drop and re-run)

```bash
dropdb safein && createdb safein
psql -U postgres -d safein -v ON_ERROR_STOP=1 -f db/schema/schema.sql
```

## What's in it

`app_user`, `auth_token` (login) · `tenant` (+ seeded Community org),
`user_tenant_membership` (role lives here) · `signal` (capture, feed, supervisor
status, anonymity, tenant-scoped).

Make someone a supervisor (role is on the membership):

```sql
UPDATE user_tenant_membership m SET role = 'supervisor'
  FROM app_user u WHERE u.id = m.user_id AND u.email = 'boss@example.com';
```

> The `docs/SafeIn5-Backend-Phase-*.md` files narrate how each part was built,
> phase by phase; this single `schema.sql` is the current live schema.
> The full future target schema (DB-level RLS, pseudonymity, QR, media) is in
> `docs/db/migrations/`.
