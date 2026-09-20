## Why

Developers and QA need a ready-to-import way to exercise every HTTP API in this codebase. Automated Jest e2e was considered and dropped in favor of a **Postman Collection v2.1** so people can explore auth flows and domain routes interactively against a running local (or remote) API.

## What Changes

- Add a **Postman Collection v2.1** covering all current `/api/v1` HTTP routes (health, auth, signals, audio, STT, uploads, Take 5)
- Add a companion **Postman Environment** with `baseUrl`, `accessToken`, refresh-cookie handling notes, and placeholders for OTP / magic-link / media tokens
- Include an ordered **auth flow** folder: register → OTP request → OTP verify (save Bearer) → `/me` → refresh → logout (plus magic-link examples)
- Document import/run steps (schema applied manually; app running; how OTP is obtained in dev)
- Replaces the withdrawn `add-http-api-e2e-tests` plan — **no** Jest e2e suite in this change
- Out of scope: Socket.IO realtime collection; Newman CI gate (optional follow-up)

## Capabilities

### New Capabilities
- `postman-api-collection`: Postman v2.1 collection + environment for manual/automated API exploration of all REST endpoints

### Modified Capabilities

## Impact

- New files under `postman/` (or `docs/postman/`): collection JSON + environment JSON
- README (or `docs/testing.md`) link and short usage notes
- No runtime application code changes required
- Testers must run the API locally with valid `.env` and Postgres; OTP codes come from email/logs depending on mailer config
