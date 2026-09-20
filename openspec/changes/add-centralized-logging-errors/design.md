## Context

See proposal.md — Why. Foundation already shipped: `AppLoggerService`, nestjs-pino access logs with `x-request-id`, ALS `requestId`, `AllExceptionsFilter`. Remaining gap: Nest-classic call DX (`message`, optional meta, trailing `Service.method` context) and removal of `step` / `mutation` conventions so call sites can log full result dumps like existing Nest services.

## Goals / Non-Goals

**Goals:**
- Nest-style `debug|info|warn|error(message, …optionalParams)` as the primary API
- Trailing string → that write’s log context (e.g. `AssociateService.getNCTAssociates`)
- Middle objects → structured fields; Errors → `err`
- ALS `requestId` (and optional actor ids) still merged into domain logs
- Call sites MAY log full serialized query/result payloads

**Non-Goals:**
- Required `step()` / `mutation()` helpers or mutation-field conventions
- A redaction layer that strips wholesale result payloads
- Replacing Pino / adding Datadog/CloudWatch
- Changing business validation beyond error presentation

## Decisions

### 1. Keep nestjs-pino; AppLoggerService facade
- **Choice:** TRANSIENT `AppLoggerService` over `PinoLogger`
- **Why:** Already wired; avoid dual stacks

### 2. Nest-classic argument parsing
- **Choice:** Last string among optional params = context for that call (`pino.setContext` for the write, or equivalent field). Objects merge into the log object. `Error` instances become `err`. First arg remains the message string (or Error).
- **Why:** Matches Nest `Logger` / existing services (e.g. `logger.info(msg, 'Service.method')`, `logger.error(err.message, { error }, 'Service.method')`)
- **Alternatives:** Object-first Pino only — unfamiliar to Nest call sites

### 3. Remove step / mutation helpers
- **Choice:** Delete `step` / `mutation` (or leave unused and migrate all call sites off them). Prefer Nest-style strings for success/failure/debug dumps.
- **Why:** Align with requested DX; avoid two parallel APIs
- **Alternatives:** Keep helpers as thin wrappers — rejected for this update

### 4. Full payload logging
- **Choice:** Do not strip `JSON.stringify(...)` of result arrays/objects when passed in the message
- **Why:** Spec requires call sites can dump full associates / pathways / responses at debug/info
- **Trade-off:** Large / sensitive logs — gate with `LOG_LEVEL` (e.g. `info` in prod)

### 5. Request id
- **Choice:** Keep ALS middleware + merge `requestId` into every domain log
- **Why:** Correlate access + domain lines without threading ids

### 6. Global exception filter
- **Choice:** Unchanged `{ code, message, requestId? }`; no stacks to clients in production
- **Why:** Uniform API errors

## Risks / Trade-offs

- [Large debug dumps] → Default/prod `LOG_LEVEL=info` so debug payloads stay local
- [PII in dumps] → Accepted by this change; operators own level + retention
- [ALS outside HTTP] → Sweepers log without requestId (acceptable)

## Migration Plan

1. Fix `normalizeLogArgs` / write path so trailing context is applied as Pino context
2. Remove `step` / `mutation` and migrate domain call sites to Nest-style `(message, meta?, context)`
3. Update `docs/logging.md` with Nest-style examples (including full-result debug dumps)
4. Run unit tests / build

## Open Questions

- None for this revision
