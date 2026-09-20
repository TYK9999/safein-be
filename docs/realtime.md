# Realtime (Socket.IO)

Worker app and SIGNAL back office connect to the Nest process over Socket.IO.
Presence and published events are stored in `realtime_connection`,
`realtime_connection_room`, and `realtime_message` (`db/schema/realtime.sql`).

## Connect

- **URL:** same host/port as the HTTP API (e.g. `http://localhost:3000`)
- **Namespace:** `/realtime`
- **Path:** Socket.IO default `/socket.io`

Handshake ids are the integer primary keys from Postgres (`tenant.id`,
`app_user.id`, `site.id`) — not UUIDs. Unknown tenant/user FKs are rejected.

Example (browser / Node client):

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/realtime', {
  auth: {
    clientType: 'backoffice', // or 'worker'
    tenantId: 1,
    userId: 12, // optional; joins user:{id} for notifications
  },
});
```

### Handshake (required)

| Field | Values | Notes |
|-------|--------|--------|
| `clientType` | `worker` \| `backoffice` | Rejected otherwise |
| `tenantId` | positive integer (or numeric string) | `tenant.id`; connection row FK |
| `userId` | optional positive integer | `app_user.id`; joins `user:{id}` |
| `siteIds` | optional integer[] | Stored on the connection; site rooms later |
| `token` | optional string | Validated when auth module lands |

## Rooms (server-assigned)

| Room | Who joins |
|------|-----------|
| `tenant:{tenantId}` | All clients for that tenant |
| `tenant:{tenantId}:pulse` | All clients for that tenant |
| `tenant:{tenantId}:echoes` | `backoffice` only |
| `user:{userId}` | When `userId` provided |

Clients must not send room join requests; the server joins on connect and
writes the room names to `realtime_connection_room`.

## Events (server → client)

Each emit is also inserted into `realtime_message` (`direction = outbound`).

| Event | Room target | Payload (minimum) |
|-------|-------------|-------------------|
| `echo.queue.updated` | `tenant:{id}:echoes` | `tenantId`, `echoId`, `updateType` (`created` \| `assigned` \| `status_changed` \| `closed`), optional `status` |
| `pulse.status.updated` | `tenant:{id}:pulse` | `tenantId`, `sessionId`, `status`, optional `stage` |
| `notification.created` | `user:{userId}` | `tenantId`, `notificationId`, `type`, `userId`, optional `title` |
| `signal.updated` | `tenant:{id}` | `tenantId`, `signalId`, `updateType` (`created` \| `acknowledged` \| `closed`) |

Domain modules publish via injectable `RealtimePublisher` (`emitEchoQueueUpdated`, `emitPulseStatusUpdated`, `emitNotificationCreated`, `publishSignalUpdate`).

## CORS

Set `SOCKET_IO_CORS_ORIGINS` to a comma-separated allow-list (see `.env.example`). `*` is forbidden when `NODE_ENV=production`.

## Local smoke test

With the API running, schema applied, and `.env` configured (community tenant
is id `1`):

```bash
npm run smoke:realtime
```
