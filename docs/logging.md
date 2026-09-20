# Logging and API errors

## Log levels

Set `LOG_LEVEL` in `.env` (case-insensitive):

| Value | Use |
|-------|-----|
| `debug` | Local troubleshooting (includes full result dumps) |
| `info` | Default — access logs + domain info |
| `warn` | Client errors (4xx) and recoverable issues |
| `error` | Failures only |

Also accepted: `fatal`, `trace`, `silent` (Pino). Examples: `DEBUG`, `Info`, `warn`.

## Nest-classic call style

Inject `AppLoggerService`. Optional constructor `setContext(ServiceName)`; prefer a trailing **`Service.method`** context on each call:

```ts
this.logger.debug(
  `User IDs: ${JSON.stringify(associateUserIds)}, where: ${JSON.stringify(whereClause)}`,
  `AssociateService.getNCTAssociates`,
);

this.logger.info(
  `Fetched associates using provided data`,
  `AssociateService.getNCTAssociates`,
);

this.logger.debug(
  `Fetched associates: ${JSON.stringify(associates)}`,
  `AssociateService.getNCTAssociates`,
);

this.logger.error(
  error.message,
  { error },
  `AssociateService.getNCTAssociates`,
);
```

- First argument: message string (or `Error`) — full text is kept, including `JSON.stringify` of query results
- Optional middle object(s): structured fields (e.g. `{ error }`)
- Trailing string: log context for that write

HTTP access logs (method, path, status, duration, `requestId`) come from nestjs-pino. Response header: `x-request-id`.

During an HTTP request, domain logs also get `requestId` (and `userId` / `tenantId` after JWT auth) via AsyncLocalStorage.

## API error shape

All unhandled HTTP exceptions go through `AllExceptionsFilter`:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "…",
  "requestId": "…"
}
```

- `HttpException` → same status; prefers `{ code, message }` from the exception body
- Unexpected errors → `500` / `INTERNAL_ERROR` (generic message in production; no stack in the response)
- Correlate with access logs via `requestId`
