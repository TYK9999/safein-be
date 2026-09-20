# Postman API collection

Importable **Postman Collection v2.1** for all current SafeIn5 HTTP routes under `/api/v1`.

## Files

| File | Purpose |
|------|---------|
| [`postman/SafeIn5-API.postman_collection.json`](../postman/SafeIn5-API.postman_collection.json) | Requests (Health, Auth, Signals, Audio, STT, Uploads, Take5) |
| [`postman/SafeIn5-Local.postman_environment.json`](../postman/SafeIn5-Local.postman_environment.json) | `baseUrl`, `accessToken`, `email`, `otpCode`, ids |

## Import

1. Postman → **Import** → select both JSON files.
2. Select environment **SafeIn5 Local**.
3. Set `baseUrl` if needed (default `http://localhost:3000`).
4. Start the API (`npm run start:dev`) with Postgres schema applied and a valid `.env`.

## Auth flow (run in order)

1. **Register** — uses `{{email}}` / name vars (204; also sends OTP).
2. **OTP Request** — 204; copy the OTP from SES / mailer into env `otpCode`.
3. **OTP Verify** — test script saves `accessToken` from the body; Postman cookie jar keeps the httpOnly refresh cookie (`path=/api/v1`).
4. **Me** — Bearer via collection auth (`{{accessToken}}`).
5. **Refresh** — no Bearer; relies on cookie (enable cookies; same host as `baseUrl`). Also returns a new `accessToken` and `expiresIn`.
6. **Logout** — clears refresh cookie.

There is no magic-link sign-in. Invite emails also carry an OTP; the first successful verify activates the account.

If a Bearer token expires, retry the API with cookies enabled: a valid refresh cookie mints a new access token (response header `X-Access-Token`) without another OTP.

## Prerequisites by folder

| Folder | Notes |
|--------|--------|
| Health | Public |
| Auth | Mailer/SES for OTP delivery |
| Signals | Bearer required; **Acknowledge/Close** need DB role `supervisor` |
| Audio / STT / Uploads | Optional JWT; real success needs S3 (and Transcribe / ffmpeg as applicable) |
| Take5 | Public; needs `CURSOR_API_KEY` |

## Variable hand-offs

| After request | Sets |
|---------------|------|
| OTP Verify / Refresh | `accessToken` |
| Create signal | `signalId` |
| Audio/STT Presign | `s3Key` |
| STT Start job | `jobId` |
| Uploads Next — start | `sessionToken`, `videoToken` |
