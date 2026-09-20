## 1. Logger foundation

- [x] 1.1 Add logging module with injectable `AppLoggerService` (Nest `LoggerService`) backed by nestjs-pino
- [x] 1.2 Normalize `LOG_LEVEL` in env schema to accept `debug|info|warn|error` (case-insensitive) and wire into Pino/`LoggerModule`
- [x] 1.3 Configure request id generation/propagation and HTTP access logging (method, path, status, duration); keep body serializers redacted

## 2. Global API error handling

- [x] 2.1 Implement global HTTP exception filter with stable `{ code, message, requestId? }` (or agreed shape)
- [x] 2.2 Map HttpException / validation errors to 4xx; unknown errors to 500 without stack in production; log with request id
- [x] 2.3 Register the filter globally in `main.ts` or `AppModule`

## 3. Codebase adoption

- [x] 3.1 Replace Nest `new Logger(...)` usages with `AppLoggerService` across modules
- [x] 3.2 Add/adjust structured logs for important domain outcomes (auth, messaging, signals, media/STT, take5) without secrets
- [x] 3.3 Document logging levels, redaction rules, and error response contract in `docs/` or README

## 4. Mutation and step tracing

- [x] 4.1 Bind `requestId` (and optional actor ids) into domain logs for the duration of each HTTP request
- [x] 4.2 Auth: mutation/step logs for register, OTP request/verify, magic-link, refresh, logout (no secrets)
- [x] 4.3 Signals: mutation logs for create, acknowledge, close (ids + outcome + requestId)
- [x] 4.4 Audio, STT, uploads, take5: mutation and pipeline step logs with shared requestId
- [x] 4.5 Align messaging send success/failure logs with the mutation convention (messageId only)
- [x] 4.6 Update `docs/logging.md` with mutation/step-tracing examples

## 5. Nest-classic logger DX

- [x] 5.1 Fix `AppLoggerService` arg parsing: trailing string = per-call context; objects/Errors as meta; do not strip full message payloads
- [x] 5.2 Remove `step` / `mutation` from `AppLoggerService`
- [x] 5.3 Migrate domain call sites to Nest-style `(message, meta?, 'Service.method')`
- [x] 5.4 Update `docs/logging.md` for Nest-style usage and full-result debug dumps; drop mutation/step/redaction guidance
- [x] 5.5 Run tests and build
