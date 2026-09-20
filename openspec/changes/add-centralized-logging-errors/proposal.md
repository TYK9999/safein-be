## Why

The API already uses nestjs-pino for HTTP access logs and a centralized `AppLoggerService`, but call-site DX should match Nest’s familiar logger style (message string + optional meta + trailing context like `ServiceName.method`). Operators need env-controlled levels, uniform API errors, and **request correlation** via `requestId`. Debug/info paths MUST be able to log full query result payloads (e.g. `JSON.stringify(associates)`) the same way existing Nest services do.

## What Changes

- Keep a **centralized `AppLoggerService`** (Nest `LoggerService`) backed by nestjs-pino
- Primary call style: Nest-classic `debug` / `info` / `warn` / `error` with:
  - message string (or Error) first
  - optional middle object(s) for structured fields (e.g. `{ error }`)
  - optional trailing string context (`AssociateService.getNCTAssociates`) applied as that log’s context
- Standardize **HTTP access logging** (method, URL, status, duration, request id)
- Drive verbosity from **`LOG_LEVEL`**: `debug` | `info` | `warn` | `error` (case-insensitive)
- Keep **global HTTP exception filter** with stable `{ code, message, requestId? }`
- Attach **`requestId`** (ALS) to domain logs automatically
- **Remove** dedicated `step` / `mutation` helpers and mutation/step correlation conventions from the logging contract
- **Allow / require** full result dumps when call sites log them (e.g. debug `JSON.stringify` of query results / response objects)
- Document Nest-style usage and error contract

## Capabilities

### New Capabilities
- `app-logging`: Central logger, Nest-style call API, env log levels, request tracing, full payload logging at call-site discretion
- `api-error-handling`: Global exception handling and consistent API error responses with error logging

### Modified Capabilities

## Impact

- `AppLoggerService` argument parsing / context handling refined for Nest-classic signatures
- Domain call sites migrate to Nest-style `(message, …meta?, context)`; drop `mutation()` / `step()` usage
- Env: `LOG_LEVEL`; builds on nestjs-pino — no second logging stack
