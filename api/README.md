# API collections

Two ways to test every endpoint (auth, signals, uploads). Start the app first
(`npm run start:dev`).

| File | Use with |
|------|----------|
| `SafeIn5-Auth.postman_collection.json` | Postman / Insomnia / Bruno / Thunder Client — **Import** this file |
| `auth.http` | VS Code — install the **REST Client** extension, click "Send Request" |

## The OTP step (both)

The OTP code and magic link are printed to the **server log** (dev mailer), not
returned in the response:

```
[DEV MAIL] OTP for sam@example.com: 481920
```

Flow: **Register** → copy the code from the log → set it (`otp` variable in
Postman, `@otp` in `auth.http`) → **Verify OTP**. The access token is captured
automatically, so **Get current user**, **Refresh**, and everything under
**Signals** work straight after.

## Signals (phase 2)

Under the **Signals** folder: **Create signal** (saves the new id), **Feed**,
**My signals**, **Get signal by id**. All require the access token from the auth
flow above. `classification` is one of `good_practice`, `be_aware`,
`needs_attention_now`.

## Uploads (chunked, guided flow)

**Initiate** returns the signed URL for part 1; **each PUT returns the next part's
URL** (it records the part for you); PUTting the **last** part auto-assembles the
file and returns the result. So the loop is: **Initiate → PUT → PUT → …** — you
never call confirm/complete/presign yourself.

- **Postman:** run `1. Initiate`, then click `2. Upload next part bytes` once per
  part — its test script captures the next URL into `nextUrl`, so just keep
  clicking 2 until the console logs `UPLOAD COMPLETED`.
- **REST Client (`U*`):** send `U1..U4` in order — each PUT points at the previous
  response's `next.uploadUrl`.
- **The bearer token is optional.** Send it and the upload is tied to your account
  (owner-scoped); omit it and the upload is **anonymous** (no account, Community
  tenant). The `.http` requests have the `Authorization` line commented — uncomment
  it (and set `@otp`/login first) to test authenticated; in Postman clear the
  `accessToken` variable to go anonymous. The byte **PUT** always also needs the
  signed URL and `Content-Type: application/octet-stream`.
- The part bodies are **sample text** so the flow works out of the box. For a real
  video, replace each PUT body with a file chunk (Postman: Body → *binary*; REST
  Client: `< ./chunk-1.bin`) and set `totalParts` to match.
- Declare a whole-file `checksum` (sha256 hex) and `totalBytes` at **Initiate** for
  end-to-end integrity verification at auto-complete.
- **Abort** discards a still-pending upload.

> Set `UPLOAD_URL_SECRET` in your `.env` — otherwise the dev server generates an
> ephemeral one each boot and signed URLs stop working after a restart.

Base URL defaults to `http://localhost:3000`; feature routes are under `/api/v1`.
