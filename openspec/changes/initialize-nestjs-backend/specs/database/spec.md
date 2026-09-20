## Purpose

Defines PostgreSQL as the system of record for SafeIn5 backend data, including connectivity, schema source of truth, and participation in readiness checks.

## ADDED Requirements

### Requirement: PostgreSQL is the primary datastore
The system MUST use PostgreSQL as the relational database for application data. The application MUST obtain a connection from configuration (not hardcoded credentials).

#### Scenario: App connects using configured credentials
- **WHEN** valid PostgreSQL connection settings are provided
- **THEN** the application can open a connection pool and execute queries against that database

### Requirement: Schema source of truth is versioned SQL plus typed mappings
The system MUST keep a versioned SQL schema definition under `db/schema/` and a corresponding TypeScript database type mapping under `src/database/` so query code stays aligned with the live schema.

#### Scenario: Initial schema artifacts exist
- **WHEN** this foundation change is applied
- **THEN** a baseline `db/schema/schema.sql` and matching TypeScript schema types exist (even if domain tables are minimal or stubbed)

### Requirement: Database readiness is observable
The system MUST verify database connectivity as part of readiness reporting used by the health endpoint.

#### Scenario: Failed ping surfaces as not ready
- **WHEN** a simple connectivity check against PostgreSQL fails
- **THEN** readiness reporting marks the database dependency as unavailable

### Requirement: Local development can run Postgres via Compose
The project MUST provide a Docker Compose (or equivalent) definition that starts a local PostgreSQL instance suitable for development, documented with the env keys needed to connect the API to it.

#### Scenario: Developer starts local Postgres
- **WHEN** a developer runs the documented Compose command for the database service
- **THEN** a PostgreSQL instance is available on the configured host/port for the API to use
