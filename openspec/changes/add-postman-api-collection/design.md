## Context

See proposal.md — Why. `add-http-api-e2e-tests` was removed by request. Controllers expose `/api/v1` routes for health, auth, signals, audio, stt, uploads, take5. Auth uses Bearer access JWT + httpOnly refresh cookie on `/api/v1/auth/*`.

## Goals / Non-Goals

**Goals:**
- Hand-maintained Postman Collection v2.1 + Environment checked into the repo
- Auth folder with scripts to capture `accessToken`
- Folders aligned to modules; variables for ids returned by prior calls where practical

**Non-Goals:**
- Jest/supertest e2e in this change
- Auto-generating the collection from OpenAPI (no OpenAPI artifact yet)
- Guaranteeing refresh-cookie automation inside Postman (cookie jar works in Postman app; document it)
- Newman CI pipeline (optional later)

## Decisions

### 1. Location: `postman/`
- **Choice:** `postman/SafeIn5-API.postman_collection.json` + `postman/SafeIn5-Local.postman_environment.json`
- **Why:** Easy to find; importable without digging through docs
- **Alternatives:** `docs/postman/` — also fine; prefer top-level `postman/`

### 2. Collection auth + folder overrides
- **Choice:** Collection-level Bearer `{{accessToken}}`; mark public auth/health/take5 routes as no-auth at request level
- **Why:** Protected routes inherit token; public routes stay callable pre-login
- **Alternatives:** Per-request auth only — more duplication

### 3. Auth scripts
- **Choice:** On OTP verify and magic-link consume responses, `pm.environment.set('accessToken', json.accessToken)` (adjust to actual response shape)
- **Why:** One-click flow after pasting OTP into `otpCode`
- **Alternatives:** Manual copy-paste only — worse DX

### 4. Refresh cookie
- **Choice:** Rely on Postman’s cookie jar for `localhost` after verify; document that refresh/logout need the same domain and cookie enabled
- **Why:** Refresh token is httpOnly — not available as an env var by design
- **Alternatives:** Expose refresh in body for testing only — rejected (security drift)

### 5. Example bodies
- **Choice:** Minimal valid JSON examples matching Zod DTOs (email, signal classification, upload next, take5 text document)
- **Why:** Paste-and-run against a running server

### 6. OTP source
- **Choice:** Environment variable `otpCode` filled by the tester from SES inbox or server logs (depending on mailer)
- **Why:** Collection cannot read the DB or email for the user

## Risks / Trade-offs

- [Collection drifts from controllers] → Keep folders 1:1 with modules; update collection when routes change
- [Refresh cookie blocked cross-origin] → Use `baseUrl` matching API host; enable cookies in Postman
- [Supervisor-only signal routes] → Document that acknowledge/close need a supervisor membership (manual DB role update)
- [Media routes need S3] → Examples still present; document AWS/S3 prerequisites for success

## Migration Plan

1. Author collection + environment JSON from current controllers
2. Add README/`docs` import instructions
3. Smoke-import in Postman against local API
4. Withdraw any remaining references to the cancelled Jest e2e plan

## Open Questions

- None blocking; Newman in CI deferred
