## 1. Dependencies and module skeleton

- [x] 1.1 Add `@nestjs/websockets`, `@nestjs/platform-socket.io`, and `socket.io` dependencies
- [x] 1.2 Create `src/modules/realtime` with RealtimeModule wired into AppModule
- [x] 1.3 Add env config for Socket.IO CORS origins (required list; no silent `*` in production)

## 2. Gateway connection

- [x] 2.1 Implement Socket.IO gateway on namespace `/realtime` attached to the Nest/Express server
- [x] 2.2 Validate handshake `clientType` (`worker` | `backoffice`) and `tenantId`; reject otherwise
- [x] 2.3 Join rooms server-side (`tenant:{id}`, `tenant:{id}:echoes` for backoffice, `user:{id}` when `userId` present)
- [x] 2.4 Handle disconnect cleanup

## 3. Events publisher

- [x] 3.1 Define Zod (or typed) payloads for `echo.queue.updated`, `pulse.status.updated`, `notification.created`
- [x] 3.2 Implement RealtimePublisher with emit helpers targeting the correct rooms
- [x] 3.3 Export publisher from RealtimeModule for future domain modules

## 4. Docs and verification

- [x] 4.1 Document connect URL, handshake fields, rooms, and event contracts (`docs/realtime.md` and/or README link)
- [x] 4.2 Add unit tests for handshake reject/accept and publisher room targeting
- [x] 4.3 Manually smoke-test a client connection (or documented script) against local server
