## Purpose

Provides a single injectable application logger with Nest-classic call signatures, env-controlled levels, HTTP request tracing (including `requestId`), and support for logging full query/result payloads when call sites choose to.

## ADDED Requirements

### Requirement: Central injectable logger
The system MUST expose a single application logger service that modules inject instead of constructing ad-hoc loggers. The logger MUST support at least `debug`, `info`, `warn`, and `error` methods.

#### Scenario: Service logs with context
- **WHEN** a domain service logs an info event through the central logger with a context name
- **THEN** the log output includes that context and the message at info level

### Requirement: Nest-style log calls
The logger MUST accept Nest-classic signatures: first argument is the message (string or Error); optional middle arguments MAY be objects merged as structured fields; a trailing string argument MUST be treated as the log context for that call (e.g. `AssociateService.getNCTAssociates`), overriding any constructor `setContext` for that write.

#### Scenario: Info with service.method context
- **WHEN** the service calls `logger.info('Fetched associates using provided data', 'AssociateService.getNCTAssociates')`
- **THEN** an info log is emitted with that message and context `AssociateService.getNCTAssociates`

#### Scenario: Error with meta object and context
- **WHEN** the service calls `logger.error(error.message, { error }, 'AssociateService.getNCTAssociates')`
- **THEN** an error log is emitted with the message, structured fields from the object, and that context

### Requirement: Full result payload logging
When a call site logs query results or response objects (including via `JSON.stringify` of arrays/objects such as associates or pathways), the logger MUST emit that content at the requested level. The logging system MUST NOT strip or redact wholesale result payloads.

#### Scenario: Debug dump of fetched rows
- **WHEN** the service calls `logger.debug(\`Fetched associates: ${JSON.stringify(associates)}\`, 'AssociateService.getNCTAssociates')`
- **THEN** the debug log includes the full serialized associates payload

### Requirement: Log level from environment
The system MUST read log verbosity from `LOG_LEVEL`. Supported operator-facing values MUST include `debug`, `info`, `warn`, and `error` (case-insensitive aliases such as `DEBUG`/`INFO` MAY be accepted and normalized). Messages below the configured level MUST NOT be emitted.

#### Scenario: Warn level hides debug
- **WHEN** `LOG_LEVEL` is `warn`
- **THEN** debug and info messages are not emitted, while warn and error messages are

### Requirement: HTTP request tracing
Every HTTP request handled by the API MUST produce an access/trace log that includes method, URL path, response status code, and duration (or equivalent timing). Each request MUST be correlatable via a request id (generated or taken from an incoming header when present).

#### Scenario: Successful request is logged
- **WHEN** a client calls any `/api/v1` route and receives a response
- **THEN** a request log entry exists with method, path, status, and request id

### Requirement: Domain logs share request id
Within a single HTTP request, domain logs emitted through the central logger MUST include the same `requestId` as the access log when a request context is active.

#### Scenario: Multi-log flow correlation
- **WHEN** a request performs multiple service log calls
- **THEN** each domain log for that call carries the same `requestId` as the HTTP access log

### Requirement: Important domain events are logged
Critical domain outcomes SHOULD be logged at appropriate levels (for example: auth success/failure, messaging send success/failure, signal create/ack/close, media job start/fail, unexpected provider errors) using Nest-style calls with a `Service.method` context string.
