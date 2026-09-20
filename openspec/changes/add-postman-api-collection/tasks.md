## 1. Collection and environment

- [x] 1.1 Create `postman/SafeIn5-Local.postman_environment.json` with `baseUrl`, `accessToken`, `email`, `otpCode`, `magicToken`, and id placeholders (`signalId`, `sessionToken`, `jobId`, etc.)
- [x] 1.2 Create Postman Collection v2.1 with collection Bearer auth on `{{accessToken}}` and folders: Health, Auth, Signals, Audio, STT, Uploads, Take5
- [x] 1.3 Add Auth flow requests: register → OTP request → OTP verify (script saves `accessToken`) → me → refresh → logout; plus magic-link request/consume with token save
- [x] 1.4 Add requests for all remaining `/api/v1` routes with example bodies/params; public routes disable inherited auth where needed

## 2. Docs and sanity check

- [x] 2.1 Document import steps, auth flow, cookie jar for refresh, and supervisor/S3 prerequisites in README or `docs/postman.md`
- [x] 2.2 Cross-check collection paths/methods against all controllers; note any route that needs a prior variable from another response
