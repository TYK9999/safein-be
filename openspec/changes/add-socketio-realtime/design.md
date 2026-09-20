## Context

See proposal.md - Why. NestJS 11 + Express HTTP API already exists (`/api/v1`). Worker app and SIGNAL back office need live Echo queue, PULSE status, and notifications. Choice: **Nest + Socket.IO**.

## Goals / Non-Goals

**Goals:**
- Nest Socket.IO gateway co-hosted with Express
- Handshake with `clientType` + `tenantId` (auth token hook ready for later)
- Rooms: tenant, optional site, optional user
- Event publisher service + documented event names/payloads
- Basic unit tests for gateway join/reject and publisher emit targeting

**Non-Goals:**
- Implementing Echo/PULSE/notification domain persistence (emit from stubs/tests only)
- Full JWT/cookie validation product (wire a pluggable guard/middleware stub)
- Redis Socket.IO adapter / multi-node fanout (single process MVP)
- Kafka bridge
- Client SDK packages (document contracts only)

## Decisions

### 1. Socket.IO via Nest gateway (not raw `ws`)
- **Choice:** `@nestjs/websockets` + `@nestjs/platform-socket.io` + `socket.io`
- **Why:** User preference; rooms, namespaces, FE ecosystem
- **Alternatives:** Native WebSocket gateway - fewer features; SSE - one-way only

### 2. Same Nest process as HTTP
- **Choice:** Attach Socket.IO to the existing Express HTTP server
- **Why:** One deployable; shared config/DI
- **Alternatives:** Separate realtime service - premature

### 3. Namespace
- **Choice:** Default namespace `/` or dedicated `/realtime` - prefer **`/realtime`** to isolate from future admin sockets
- **Why:** Clear client URL: same host as API, path `/realtime`

### 4. Handshake auth shape (MVP)
```
auth: {
  clientType: 'worker' | 'backoffice',
  tenantId: string,
  userId?: string,
  siteIds?: string[],
  token?: string   // validated when auth module exists
}
```
- Reject if `clientType` or `tenantId` missing
- Token validation: optional no-op / reject-if-present-invalid stub until auth lands

### 5. Room naming
| Room | Pattern | Used for |
|------|---------|----------|
| Tenant | `tenant:{tenantId}` | Broadcast within org |
| Echo queue (back office) | `tenant:{tenantId}:echoes` | Echo queue updates |
| PULSE | `tenant:{tenantId}:pulse` or `pulse:{sessionId}` | Live PULSE |
| User notifications | `user:{userId}` | Directed notifications |

Back-office joins `echoes` (+ tenant); workers join pulse/user as applicable.

### 6. Event names (stable)
| Event | Direction | Purpose |
|-------|-----------|---------|
| `echo.queue.updated` | S→C | Echo created/assigned/status changed |
| `pulse.status.updated` | S→C | PULSE stage/status change |
| `notification.created` | S→C | New notification |

Payloads: Zod-validated DTOs at the publisher boundary (ids + type/status + optional summary; no PII dumps in logs).

### 7. Publisher service
- **Choice:** `RealtimePublisher` injectable used by future domain modules
- Methods: `emitEchoQueueUpdated`, `emitPulseStatusUpdated`, `emitNotificationCreated`
- Implementation uses Server `to(room).emit(event, payload)`

### 8. CORS
- Env-driven allowed origins for Socket.IO (list for worker + back-office URLs); no silent `*` in production

## Risks / Trade-offs

- [Auth not finished] -> Handshake requires tenant/clientType now; token check becomes hard requirement when auth ships
- [Single node] -> Fine for MVP; add Redis adapter when scaling EC2 horizontally (needs sticky sessions or adapter)
- [Event spam] -> Keep payloads small; clients patch UI by id
- [Leaky tenant rooms] -> Join only server-side from validated handshake; never trust client-sent room names

## Migration Plan

1. Add deps + RealtimeModule/gateway/publisher
2. Wire AppModule; document connect URL and events in README or `docs/realtime.md`
3. FE connects with handshake; verify with a temporary test emit endpoint or unit test
4. Later domain PRs call publisher (no gateway changes expected)

## Open Questions

- Exact payload fields once Echo/PULSE schemas are modeled (extend DTOs without renaming events)
- Whether workers receive Echo queue events or only back office (design allows both via room membership)
