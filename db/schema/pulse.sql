-- ---------------------------------------------------------------------
-- PULSE = one worker journey at a space/task (QR scan / observation).
-- Echoes and Job Checklist completions hang off a pulse.
-- ---------------------------------------------------------------------

CREATE TABLE pulse (
    id              integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id       integer     NOT NULL REFERENCES tenant (id),
    site_id         integer     REFERENCES site (id),
    space_id        integer     REFERENCES space (id),
    work_task_id    integer     REFERENCES work_task (id) ON DELETE SET NULL,
    worker_user_id  integer     REFERENCES app_user (id) ON DELETE SET NULL,
    source          text        NOT NULL DEFAULT 'work_task'
                    CHECK (source IN ('work_task', 'observation')),
    trigger         text,                          -- qr_scan, walkthrough, ...
    status          text        NOT NULL DEFAULT 'in_progress'
                    CHECK (status IN ('in_progress', 'paused', 'completed', 'stopped', 'abandoned')),
    current_stage   text
                    CHECK (current_stage IS NULL OR current_stage IN (
                        'pause', 'uncover', 'learn_5', 'shift', 'checklist', 'echo'
                    )),
    started_at      timestamptz NOT NULL DEFAULT now(),
    completed_at    timestamptz,
    stopped_at      timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    created_by      integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by      integer     REFERENCES app_user (id) ON DELETE SET NULL
);
CREATE INDEX idx_pulse_task  ON pulse (work_task_id, started_at DESC);
CREATE INDEX idx_pulse_space ON pulse (space_id, started_at DESC);
CREATE INDEX idx_pulse_tenant_status ON pulse (tenant_id, status, started_at DESC);

-- Durable events for the worker journey. The payload is workflow metadata;
-- media remains in media tables and check answers in pulse_checklist_response.
CREATE TABLE pulse_event (
    id                    integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pulse_id              integer     NOT NULL REFERENCES pulse (id) ON DELETE CASCADE,
    tenant_id             integer     NOT NULL REFERENCES tenant (id),
    actor_user_id         integer     REFERENCES app_user (id) ON DELETE SET NULL,
    stage                 text        NOT NULL
                          CHECK (stage IN ('pause', 'uncover', 'learn_5', 'shift', 'checklist', 'echo')),
    event_type            text        NOT NULL
                          CHECK (event_type IN (
                              'started', 'paused', 'resumed', 'completed',
                              'skipped', 'checked', 'unchecked', 'submitted',
                              'stopped', 'shared', 'viewed', 'acknowledged'
                          )),
    content_pack_id       integer     REFERENCES content_pack (id) ON DELETE SET NULL,
    content_prompt_id     integer     REFERENCES content_prompt (id) ON DELETE SET NULL,
    related_signal_id     integer,    -- FK added after signal exists
    reason_code            text,
    reason_text            text,
    notification_status   text
                          CHECK (notification_status IS NULL OR notification_status IN (
                              'pending', 'sent', 'acknowledged', 'failed'
                          )),
    notification_sent_at  timestamptz,
    payload               jsonb       NOT NULL DEFAULT '{}'::jsonb,
    captured_at           timestamptz NOT NULL DEFAULT now(),
    synced_at             timestamptz,
    created_at             timestamptz NOT NULL DEFAULT now(),
    updated_at             timestamptz NOT NULL DEFAULT now(),
    created_by             integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by             integer     REFERENCES app_user (id) ON DELETE SET NULL
);
CREATE INDEX idx_pulse_event_pulse ON pulse_event (pulse_id, captured_at);
CREATE INDEX idx_pulse_event_signal ON pulse_event (related_signal_id, captured_at);

-- One answer per prompt in a PULSE. Supports Uncover and the full checklist.
CREATE TABLE pulse_checklist_response (
    id                integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pulse_id          integer     NOT NULL REFERENCES pulse (id) ON DELETE CASCADE,
    content_pack_id   integer     NOT NULL REFERENCES content_pack (id) ON DELETE CASCADE,
    content_prompt_id integer     NOT NULL REFERENCES content_prompt (id) ON DELETE CASCADE,
    worker_user_id    integer     REFERENCES app_user (id) ON DELETE SET NULL,
    answer            text        NOT NULL
                      CHECK (answer IN ('yes', 'no', 'not_applicable', 'unchecked')),
    comment           text,
    viewed_at         timestamptz,
    answered_at       timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    created_by        integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by        integer     REFERENCES app_user (id) ON DELETE SET NULL,
    UNIQUE (pulse_id, content_prompt_id)
);
CREATE INDEX idx_pulse_check_response_pack
    ON pulse_checklist_response (content_pack_id, content_prompt_id);

-- Worker acknowledgement for rescue plans, Learn 5 lessons, and guidance.
CREATE TABLE pulse_content_acknowledgement (
    id                integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pulse_id          integer     NOT NULL REFERENCES pulse (id) ON DELETE CASCADE,
    content_pack_id   integer     NOT NULL REFERENCES content_pack (id) ON DELETE CASCADE,
    content_prompt_id integer     REFERENCES content_prompt (id) ON DELETE CASCADE,
    worker_user_id    integer     REFERENCES app_user (id) ON DELETE SET NULL,
    state             text        NOT NULL
                      CHECK (state IN ('viewed', 'acknowledged', 'skipped')),
    acknowledged_at   timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    created_by        integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by        integer     REFERENCES app_user (id) ON DELETE SET NULL,
    UNIQUE (pulse_id, content_pack_id, content_prompt_id)
);
CREATE INDEX idx_pulse_content_ack_pack
    ON pulse_content_acknowledgement (content_pack_id, content_prompt_id);
