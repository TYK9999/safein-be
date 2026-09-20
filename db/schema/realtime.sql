-- ---------------------------------------------------------------------
-- Socket.IO namespace /realtime.
-- Connections are process sockets plus durable rows for presence/audit.
-- Messages are the published (and later inbound) event log.
-- Handshake ids are integer FKs (tenant.id, app_user.id), not UUIDs.
-- ---------------------------------------------------------------------

CREATE TABLE realtime_connection (
    id                  integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id           integer     NOT NULL REFERENCES tenant (id),
    user_id             integer     REFERENCES app_user (id) ON DELETE SET NULL,
    socket_id           text        NOT NULL,          -- Socket.IO engine id
    namespace           text        NOT NULL DEFAULT '/realtime',
    client_type         text        NOT NULL
                        CHECK (client_type IN ('worker', 'backoffice')),
    status              text        NOT NULL DEFAULT 'connected'
                        CHECK (status IN ('connected', 'disconnected')),
    site_ids            integer[]   NOT NULL DEFAULT '{}',
    user_agent          text,
    remote_address      text,
    connected_at        timestamptz NOT NULL DEFAULT now(),
    last_seen_at        timestamptz NOT NULL DEFAULT now(),
    disconnected_at     timestamptz,
    disconnect_reason   text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    created_by          integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by          integer     REFERENCES app_user (id) ON DELETE SET NULL,
    CHECK (disconnected_at IS NULL OR status = 'disconnected'),
    CHECK (status = 'connected' OR disconnected_at IS NOT NULL)
);
-- One live socket id per process; historical rows keep the same socket_id.
CREATE UNIQUE INDEX idx_realtime_connection_socket_live
    ON realtime_connection (socket_id) WHERE status = 'connected';
CREATE INDEX idx_realtime_connection_tenant
    ON realtime_connection (tenant_id, status, connected_at DESC);
CREATE INDEX idx_realtime_connection_user
    ON realtime_connection (user_id, status)
    WHERE user_id IS NOT NULL;

-- Rooms the server assigned on connect (clients never join by name).
CREATE TABLE realtime_connection_room (
    id              integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    connection_id   integer     NOT NULL REFERENCES realtime_connection (id) ON DELETE CASCADE,
    room_name       text        NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    created_by      integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by      integer     REFERENCES app_user (id) ON DELETE SET NULL,
    UNIQUE (connection_id, room_name)
);
CREATE INDEX idx_realtime_connection_room_name
    ON realtime_connection_room (room_name);

-- Server→client (outbound) and reserved client→server (inbound) events.
CREATE TABLE realtime_message (
    id                integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id         integer     NOT NULL REFERENCES tenant (id),
    connection_id     integer     REFERENCES realtime_connection (id) ON DELETE SET NULL,
    direction         text        NOT NULL
                      CHECK (direction IN ('outbound', 'inbound')),
    event_name        text        NOT NULL
                      CHECK (event_name IN (
                          'echo.queue.updated',
                          'pulse.status.updated',
                          'notification.created',
                          'signal.updated'
                      )),
    room_name         text,                          -- Socket.IO target room (outbound)
    target_user_id    integer     REFERENCES app_user (id) ON DELETE SET NULL,
    pulse_id          integer     REFERENCES pulse (id) ON DELETE SET NULL,
    signal_id         integer     REFERENCES signal (id) ON DELETE SET NULL,
    payload           jsonb       NOT NULL DEFAULT '{}'::jsonb,
    published_at      timestamptz NOT NULL DEFAULT now(),
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    created_by        integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by        integer     REFERENCES app_user (id) ON DELETE SET NULL,
    CHECK (direction = 'inbound' OR room_name IS NOT NULL)
);
CREATE INDEX idx_realtime_message_tenant
    ON realtime_message (tenant_id, published_at DESC);
CREATE INDEX idx_realtime_message_event
    ON realtime_message (event_name, published_at DESC);
CREATE INDEX idx_realtime_message_pulse
    ON realtime_message (pulse_id, published_at DESC)
    WHERE pulse_id IS NOT NULL;
CREATE INDEX idx_realtime_message_signal
    ON realtime_message (signal_id, published_at DESC)
    WHERE signal_id IS NOT NULL;
