## Purpose

Defines the NestJS HTTP API runtime: process boot, versioned routes under `/api/v1`, structured logging, and a health endpoint clients and operators can probe.

## ADDED Requirements

### Requirement: Application boots as an HTTP API
The system MUST start an HTTP server that serves versioned API routes under the global prefix `api` and URI version `v1` (paths of the form `/api/v1/...`).

#### Scenario: Health is reachable under versioned prefix
- **WHEN** the application has started successfully
- **THEN** a health check is available at a path under `/api/v1/`

### Requirement: Health reports overall readiness
The system MUST expose a health endpoint that indicates whether the process is up and whether required dependencies (including the database) are reachable.

#### Scenario: Healthy when dependencies are up
- **WHEN** the process is running and the database connection succeeds
- **THEN** the health endpoint responds with an HTTP success status and a payload that marks the service as ready

#### Scenario: Unhealthy when database is unreachable
- **WHEN** the process is running but the database cannot be reached
- **THEN** the health endpoint responds with a non-success HTTP status that indicates the service is not ready

### Requirement: Structured request logging without sensitive payloads
The system MUST emit structured logs for HTTP requests and MUST NOT log secrets, tokens, OTP codes, email addresses, or raw request/response bodies that may contain PII.

#### Scenario: Request is logged without body
- **WHEN** a client calls any HTTP endpoint
- **THEN** a structured log entry is produced that includes method and path (or equivalent request metadata) and does not include the request body or credential values

### Requirement: Missing or invalid configuration fails fast
The system MUST refuse to start if required environment configuration is missing or invalid.

#### Scenario: Boot aborts on invalid env
- **WHEN** a required environment variable is missing or fails validation
- **THEN** the process exits during startup without accepting traffic
