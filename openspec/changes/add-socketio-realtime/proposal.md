## Why

SafeIn5 worker and SIGNAL back-office clients need live updates (Echo queue, PULSE status, notifications) without polling. The Nest HTTP API alone cannot push those events; a Socket.IO realtime layer is required so both clients can subscribe and receive server-driven updates.

## What Changes

- Add a NestJS Socket.IO gateway (Nest websockets + `socket.io`) alongside the existing Express HTTP API
- Support connections from **worker app** and **SIGNAL back office** clients
- Define realtime channels/events for **Echo queue updates**, **live PULSE status**, and **notifications** (extensible for related events)
- Scope subscriptions by tenant (and site/role where applicable) so clients only receive authorized events
- Document connection URL, auth handshake expectations, and event contracts for FE clients
- Out of scope for this change: full auth product (OTP/JWT issuance), Redis multi-instance adapter (defer until horizontal scale), and domain business logic that *creates* Echoes/PULSE (emitters can be stubs/hooks until those modules exist)

## Capabilities

### New Capabilities
- `realtime-gateway`: Socket.IO connection lifecycle, client identity (worker vs back office), rooms/tenant scoping, disconnect handling
- `realtime-events`: Server→client event contracts for Echo queue, PULSE status, and notifications

### Modified Capabilities

## Impact

- New Nest module under `src/modules/realtime` (or similar) with gateway + event publisher service
- New dependencies: `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`
- CORS / origin config for Socket.IO must align with worker and back-office origins
- Future domain modules (echoes, pulse, notifications) will inject the publisher to emit events
- CI/CD and EC2 deploy unchanged except ensuring WebSocket upgrade / sticky sessions if load-balanced later
