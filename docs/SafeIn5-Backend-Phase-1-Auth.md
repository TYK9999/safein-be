# Phase 1 (Auth slice) — Passwordless signup & login

Deliberately small: email OTP + magic-link signup/login over **two tables**
(`app_user`, `auth_token`). No tenancy, roles, RLS or anonymity yet — those are
later phases. Build and test this, then grow one phase at a time.

**Verified:** `nest build` ✅ · `tsc --noEmit` ✅ · unit tests 7/7 ✅.
**Not yet run here (needs a local Postgres):** the schema script + live HTTP — steps below.

## How it works

- **DB** — one Postgres connection (`DATABASE_URL`), Kysely, two tables.
- **JWT** — EdDSA (`jose`); dev auto-generates an ephemeral keypair at boot.
  Access token carries `{sub, email}`; refresh token is an HttpOnly cookie.
- **OTP/tokens** — only a salted SHA-256 **hash** is stored; single-use, TTL,
  attempt-count throttled.
- **Mail** — dev mailer logs the code/link to the console (no email provider needed).

## Endpoints (under `/api/v1`)

| Method · Path | Auth | Purpose |
|---|---|---|
| `POST /auth/register` | public | sign up (email → account → OTP) |
| `POST /auth/otp/request` | public | login: send an OTP to an existing account |
| `POST /auth/otp/verify` | public | verify code → access token + refresh cookie |
| `POST /auth/magic-link` | public | send a magic link |
| `GET  /auth/magic/:token` | public | verify link → access token + refresh cookie |
| `POST /auth/refresh` | cookie | new access token from the refresh cookie |
| `POST /auth/logout` | public | clear the refresh cookie |
| `GET  /me` | **bearer** | current user `{ id, email, displayName, emailVerified }` |
| `GET /healthz`, `GET /readyz` | public | liveness / readiness (root, unversioned) |

## Run it

You set up Postgres and run the one schema script by hand (see [db/README.md](../db/README.md)).

```bash
createdb safein5
psql -U postgres -d safein5 -v ON_ERROR_STOP=1 -f db/schema/01_init.sql

cp .env.example .env
npm install
npm run start:dev
```

Walk the loop (the OTP prints to the server log):

```bash
curl -s -XPOST localhost:3000/api/v1/auth/register \
  -H 'content-type: application/json' -d '{"email":"sam@example.com","displayName":"Sam"}'
# -> 204; server log: [DEV MAIL] OTP for sam@example.com: 123456

curl -s -XPOST localhost:3000/api/v1/auth/otp/verify -c cookies.txt \
  -H 'content-type: application/json' -d '{"email":"sam@example.com","code":"123456"}'
# -> { "accessToken": "...", "user": { "id":"...", "email":"sam@example.com", ... } }

curl -s localhost:3000/api/v1/me -H "authorization: Bearer <accessToken>"
curl -s -XPOST localhost:3000/api/v1/auth/refresh -b cookies.txt
```

## Next phases (kept out on purpose)

Multi-tenancy + RLS + roles, the anonymity `author_token`, guest sessions,
invitation-based onboarding, admin password login, a refresh-token revocation
store, and a global error envelope. Each lands as its own small phase with its
own `db/schema/NN_*.sql`. The full target schema is preserved in
`docs/db/migrations/` for reference.
