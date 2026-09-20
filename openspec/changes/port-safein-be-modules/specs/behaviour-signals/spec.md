## Purpose

Lets workers capture behaviour signals and lets supervisors acknowledge and close them within a tenant, with optional display-level author anonymity.

## ADDED Requirements

### Requirement: Authenticated create signal
The system SHALL allow any authenticated tenant member to create a signal with classification (`good_practice` | `be_aware` | `needs_attention_now`), body text, and optional anonymity flag. New signals MUST start in status `open`.

#### Scenario: Worker creates signal
- **WHEN** a member POSTs a valid signal
- **THEN** a signal row exists for their tenant in status `open` with the given classification and body

### Requirement: List my signals
The system SHALL allow an authenticated user to list signals they authored, newest first.

#### Scenario: Mine endpoint
- **WHEN** a user requests their signals
- **THEN** only signals authored by that user are returned

### Requirement: Tenant feed
The system SHALL allow authenticated members to list their tenant's signals (feed), optionally filtered by status, newest first.

#### Scenario: Feed filtered by status
- **WHEN** a member requests the feed with a status filter
- **THEN** only that tenant's signals with the matching status are returned

### Requirement: Get signal by id
The system SHALL return a single signal by id when it belongs to the caller's tenant; otherwise deny access.

#### Scenario: Cross-tenant denied
- **WHEN** a member requests a signal id belonging to another tenant
- **THEN** the request fails with not found or forbidden (no cross-tenant leak)

### Requirement: Supervisor acknowledge
The system SHALL allow supervisors to acknowledge an `open` signal, transitioning it to `acknowledged` and recording who/when. Acknowledge MUST be idempotent for already-acknowledged signals per existing workflow rules.

#### Scenario: Supervisor acknowledges open signal
- **WHEN** a supervisor acknowledges an open signal in their tenant
- **THEN** status becomes `acknowledged` and acknowledgment metadata is set

#### Scenario: Worker cannot acknowledge
- **WHEN** a worker attempts to acknowledge a signal
- **THEN** the request is rejected as forbidden

### Requirement: Supervisor close with note
The system SHALL allow supervisors to close an acknowledged (or workflow-allowed) signal only when a non-empty close note is provided, transitioning to `closed` and recording who/when.

#### Scenario: Close requires note
- **WHEN** a supervisor closes without a close note
- **THEN** validation fails and status is unchanged

### Requirement: Display anonymity
When `is_anonymous` is true, API presentations MUST omit or null the author identity fields. The system MAY still store `author_user_id` in the database for audit.

#### Scenario: Anonymous signal in feed
- **WHEN** a feed or get response includes an anonymous signal
- **THEN** author display fields are null or omitted while non-anonymous signals still show author

### Requirement: Realtime signal lifecycle events
When a signal is created, acknowledged, or closed, the system SHALL publish a realtime event to the appropriate tenant (and/or notification) scope so connected SIGNAL clients can refresh without polling.

#### Scenario: Create emits realtime update
- **WHEN** a signal is successfully created
- **THEN** subscribed clients in that tenant scope receive a signal-related realtime event including the signal id and update type
