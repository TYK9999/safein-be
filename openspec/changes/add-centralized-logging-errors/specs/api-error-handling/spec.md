## Purpose

Ensures every HTTP API returns a consistent, client-safe error response and that unexpected failures are logged for debugging without exposing internal stack traces to clients in production.

## ADDED Requirements

### Requirement: Global exception handling for HTTP APIs
All unhandled exceptions from HTTP controllers MUST be caught by a global exception filter (or equivalent Nest mechanism) so no route crashes the process without a structured response.

#### Scenario: Unexpected throw
- **WHEN** a controller or service throws an unexpected Error
- **THEN** the client receives a JSON error response with an appropriate 5xx status and the error is logged server-side

### Requirement: Consistent error response shape
HTTP error responses MUST use a stable JSON shape that includes at least an error `code` (or equivalent machine-readable identifier) and a `message` suitable for clients. Validation failures MUST map to 4xx with clear messages. HttpExceptions already thrown by the app MUST be preserved in status code and reflected in the same shape.

#### Scenario: Validation failure
- **WHEN** a request body fails Zod/DTO validation
- **THEN** the client receives 4xx with the standard error shape and a validation message

#### Scenario: Not found
- **WHEN** a domain handler signals not found via HttpException
- **THEN** the client receives 404 with the standard error shape

### Requirement: Errors are logged with request correlation
When the global filter handles an error, it MUST log at error (or warn for expected 4xx where useful) and include the request id when available so operators can correlate with access logs.

#### Scenario: Correlated 500
- **WHEN** an unexpected error is handled
- **THEN** the error log includes the same request id present on the access log for that request

### Requirement: No stack traces to clients in production
In production, error responses MUST NOT include stack traces or internal exception details beyond the safe message/code. Stack traces MAY appear only in server logs.

#### Scenario: Production hides stack
- **WHEN** `NODE_ENV` is `production` and an unexpected error occurs
- **THEN** the HTTP response body does not contain a stack trace
