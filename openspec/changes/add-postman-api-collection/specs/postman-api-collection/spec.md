## Purpose

Gives developers and QA an importable Postman Collection v2.1 and environment so every REST endpoint can be exercised, including a guided passwordless auth flow with Bearer and cookie variables.

## ADDED Requirements

### Requirement: Postman Collection v2.1 for all HTTP routes
The repository MUST include a Postman Collection v2.1 JSON that contains requests for every current `/api/v1` HTTP route: health, auth (register, OTP request/verify, magic-link request/consume, refresh, logout, me), signals (create, mine, feed, get, acknowledge, close), audio (presign, confirm, list), STT (presign, jobs create/list/get), uploads (next, thumbnail, playback), and Take 5 extract.

#### Scenario: Import covers health and auth
- **WHEN** a tester imports the collection into Postman
- **THEN** they can run `GET {{baseUrl}}/api/v1/health` and the auth folder requests without manually recreating URLs

#### Scenario: Domain modules present
- **WHEN** a tester expands the collection folders
- **THEN** signals, audio, STT, uploads, and take5 request groups are present with the correct methods and paths

### Requirement: Environment variables for base URL and tokens
The repository MUST include a Postman Environment (or documented environment template) defining at least `baseUrl`, `accessToken`, and placeholders used by auth/media flows (e.g. `email`, `otpCode`, `magicToken`, `signalId`, `sessionToken`, `jobId` as applicable). Authenticated requests MUST reference `{{accessToken}}` via Authorization Bearer (or equivalent collection auth).

#### Scenario: Bearer from environment
- **WHEN** `accessToken` is set in the environment and a protected request runs
- **THEN** the request sends `Authorization: Bearer {{accessToken}}`

#### Scenario: Base URL substitution
- **WHEN** `baseUrl` is `http://localhost:3000`
- **THEN** requests target that host without hard-coded hostnames in every request URL

### Requirement: Auth flow examples
The collection MUST include an ordered auth example flow: register → OTP request → OTP verify (persist access token into `accessToken`) → `GET /me` → refresh → logout, plus magic-link request and consume examples. OTP verify (and magic consume) SHOULD use a test script or clear instructions to save `accessToken` from the response body.

#### Scenario: OTP verify saves token
- **WHEN** OTP verify succeeds and returns an access token
- **THEN** the collection documents or scripts saving that value into the `accessToken` environment variable for subsequent requests

### Requirement: Documented usage
The repository MUST document how to import the collection and environment, set `baseUrl`, obtain an OTP (dev mailer/SES), and run the auth flow before protected routes.

#### Scenario: README or testing doc explains import
- **WHEN** a developer opens the documented testing section
- **THEN** they find import steps and auth-flow prerequisites
