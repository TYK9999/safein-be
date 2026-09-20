## Purpose

Defines the server-to-client realtime event contracts for Echo queue updates, live PULSE status, and notifications delivered over Socket.IO.

## ADDED Requirements

### Requirement: Echo queue updates are pushable
The system MUST support publishing Echo queue update events to subscribed back-office (and authorized worker) clients within the correct tenant scope. Each event MUST include enough identifiers for the client to refresh or patch the Echo queue UI (at minimum an Echo id and update type).

#### Scenario: New Echo surfaces to back office
- **WHEN** an Echo queue update is published for a tenant
- **THEN** connected SIGNAL back-office clients in that tenant's Echo-queue subscription receive an Echo queue update event containing the Echo id and update type

### Requirement: Live PULSE status is pushable
The system MUST support publishing PULSE status events (for example stage or session status changes) to subscribed clients in the correct tenant (and work/session) scope.

#### Scenario: PULSE status change is delivered
- **WHEN** a PULSE status update is published for a tenant-scoped session
- **THEN** subscribed clients in that scope receive a PULSE status event with session id and status

### Requirement: Notifications are pushable
The system MUST support publishing notification events to the intended recipient scope (user and/or role within a tenant). Notification events MUST include a notification id and a type or category.

#### Scenario: Notification delivered to recipient room
- **WHEN** a notification is published for a user within a tenant
- **THEN** connected clients subscribed to that user's notification scope receive a notification event with id and type

### Requirement: Event names are stable and documented
The system MUST use stable, documented event names for Echo queue, PULSE status, and notification channels so worker and back-office clients can subscribe without guessing.

#### Scenario: Client documentation lists event names
- **WHEN** a frontend developer consults the realtime docs for this change
- **THEN** they can find the event names and payload fields for Echo queue, PULSE, and notifications

### Requirement: Domain modules can emit without knowing sockets
The system MUST provide an application-facing publish API (service) so domain features can emit Echo, PULSE, and notification events without depending on raw Socket.IO client handles.

#### Scenario: Publisher emits to tenant room
- **WHEN** application code publishes an Echo queue update for a tenant via the publish API
- **THEN** connected clients in that tenant's Echo-queue room receive the corresponding event
