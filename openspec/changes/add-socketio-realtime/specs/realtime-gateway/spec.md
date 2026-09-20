## Purpose

Defines how worker and SIGNAL back-office clients establish and maintain Socket.IO connections to the SafeIn5 backend for realtime delivery.

## ADDED Requirements

### Requirement: Clients can open a Socket.IO connection
The system MUST accept Socket.IO connections from worker app and SIGNAL back-office clients on a documented realtime endpoint co-hosted with the HTTP API process.

#### Scenario: Worker connects successfully
- **WHEN** a worker client completes a valid Socket.IO handshake
- **THEN** the connection is established and the client is considered connected for realtime events

#### Scenario: Back-office connects successfully
- **WHEN** a SIGNAL back-office client completes a valid Socket.IO handshake
- **THEN** the connection is established and the client is considered connected for realtime events

### Requirement: Handshake identifies client type and tenant scope
The system MUST require handshake credentials that identify the client type (`worker` or `backoffice`) and the tenant (organisation) scope. Connections missing required handshake fields MUST be rejected.

#### Scenario: Missing tenant is rejected
- **WHEN** a client attempts to connect without a tenant identifier in the handshake
- **THEN** the connection is rejected and no realtime events are delivered to that client

#### Scenario: Unknown client type is rejected
- **WHEN** a client attempts to connect with a client type other than `worker` or `backoffice`
- **THEN** the connection is rejected

### Requirement: Events are scoped to authorized rooms
After connect, the system MUST place the client into rooms that match its tenant (and additional site/role rooms when provided). The system MUST NOT deliver another tenant's events to that client.

#### Scenario: Tenant A does not receive tenant B events
- **WHEN** an event is published for tenant B
- **THEN** a connected client scoped to tenant A does not receive that event

### Requirement: Disconnect is clean
The system MUST remove the client from rooms on disconnect and MUST NOT continue attempting delivery to that socket.

#### Scenario: Client disconnects
- **WHEN** a connected client disconnects
- **THEN** subsequent publishes for its former rooms are not delivered to that socket id
