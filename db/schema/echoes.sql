-- ---------------------------------------------------------------------
-- Echoes (signal). Worker-facing status is received → viewed → actioned → closed.
-- Supervisor loop still uses status open | acknowledged | closed for the
-- existing API (open ≈ queue, acknowledged ≈ assigned/actioned).
-- ---------------------------------------------------------------------

CREATE TABLE signal (
    id                    integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id             integer     NOT NULL REFERENCES tenant (id),
    author_user_id        integer     NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    classification        text        NOT NULL
                          CHECK (classification IN ('good_practice', 'be_aware', 'needs_attention_now')),
    body_text             text        NOT NULL,          -- AI / worker summary; voice transcript stored separately
    is_anonymous          boolean     NOT NULL DEFAULT false,
    status                text        NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open', 'acknowledged', 'closed')),
    acknowledged_at       timestamptz,
    acknowledged_by       integer     REFERENCES app_user (id),
    closed_at             timestamptz,
    closed_by             integer     REFERENCES app_user (id),
    close_note            text,

    -- SIGNAL prototype (MVP)
    echo_ref              text,                          -- 4471-03
    title                 text,
    ai_summary            text,
    transcript            text,
    source                text        CHECK (source IS NULL OR source IN ('work_task', 'observation')),
    pulse_stage           text        CHECK (pulse_stage IS NULL OR pulse_stage IN ('shift', 'uncover', 'checklist', 'learn_5')),
    worker_visible_status text        NOT NULL DEFAULT 'received'
                          CHECK (worker_visible_status IN ('received', 'viewed', 'actioned', 'closed', 'held')),
    site_id               integer     REFERENCES site (id),
    space_id              integer     REFERENCES space (id),
    work_task_id          integer     REFERENCES work_task (id) ON DELETE SET NULL,
    pulse_id              integer     REFERENCES pulse (id) ON DELETE SET NULL,
    hazard_category_id    integer     REFERENCES hazard_category (id),
    assigned_to_user_id   integer     REFERENCES app_user (id) ON DELETE SET NULL,
    assigned_at           timestamptz,
    assigned_by           integer     REFERENCES app_user (id),
    due_at                timestamptz,
    viewed_at             timestamptz,
    viewed_by             integer     REFERENCES app_user (id),
    actioned_at           timestamptz,
    actioned_by           integer     REFERENCES app_user (id),
    captured_at           timestamptz,
    synced_at             timestamptz,
    geo_lat               double precision,
    geo_lng               double precision,
    title_edited_by       integer     REFERENCES app_user (id),
    classification_source text        CHECK (classification_source IS NULL OR classification_source IN ('ai', 'human')),

    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),
    created_by            integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by            integer     REFERENCES app_user (id) ON DELETE SET NULL
);

CREATE INDEX idx_signal_tenant_created ON signal (tenant_id, created_at DESC);
CREATE INDEX idx_signal_tenant_status  ON signal (tenant_id, status, created_at DESC);
CREATE INDEX idx_signal_author         ON signal (author_user_id, created_at DESC);
CREATE INDEX idx_signal_queue          ON signal (tenant_id, worker_visible_status, created_at DESC);
CREATE INDEX idx_signal_task           ON signal (work_task_id, created_at DESC);
CREATE INDEX idx_signal_space          ON signal (space_id, created_at DESC);
CREATE INDEX idx_signal_assignee       ON signal (assigned_to_user_id, worker_visible_status);

ALTER TABLE pulse_event
    ADD CONSTRAINT pulse_event_signal_fk
    FOREIGN KEY (related_signal_id) REFERENCES signal (id) ON DELETE SET NULL;
ALTER TABLE work_task_prompt_setting
    ADD CONSTRAINT work_task_prompt_setting_signal_fk
    FOREIGN KEY (source_signal_id) REFERENCES signal (id) ON DELETE SET NULL;

CREATE TABLE signal_classification_event (
    id             integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    signal_id      integer     NOT NULL REFERENCES signal (id) ON DELETE CASCADE,
    classification text        NOT NULL
                   CHECK (classification IN ('good_practice', 'be_aware', 'needs_attention_now')),
    source         text        NOT NULL CHECK (source IN ('ai', 'human')),
    actor_user_id  integer     REFERENCES app_user (id) ON DELETE SET NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    created_by     integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by     integer     REFERENCES app_user (id) ON DELETE SET NULL
);
CREATE INDEX idx_signal_class_event ON signal_classification_event (signal_id, created_at);

-- Acknowledgements shown to the reporter (one per worker-visible status).
CREATE TABLE signal_acknowledgement (
    id             integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    signal_id      integer     NOT NULL REFERENCES signal (id) ON DELETE CASCADE,
    stage          text        NOT NULL
                   CHECK (stage IN ('received', 'viewed', 'actioned', 'closed')),
    body_text      text        NOT NULL,
    sent_at        timestamptz,
    is_automatic   boolean     NOT NULL DEFAULT false,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    created_by     integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by     integer     REFERENCES app_user (id) ON DELETE SET NULL,
    UNIQUE (signal_id, stage)
);

CREATE TABLE checklist_completion (
    id                integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id         integer     NOT NULL REFERENCES tenant (id),
    pulse_id          integer     REFERENCES pulse (id) ON DELETE SET NULL,
    space_id          integer     REFERENCES space (id),
    work_task_id      integer     REFERENCES work_task (id) ON DELETE SET NULL,
    content_pack_id   integer     REFERENCES content_pack (id) ON DELETE SET NULL,
    worker_user_id    integer     REFERENCES app_user (id) ON DELETE SET NULL,
    outcome           text        NOT NULL
                      CHECK (outcome IN ('carried_on', 'changed_plan', 'stopped')),
    signal_id         integer     REFERENCES signal (id) ON DELETE SET NULL,
    completed_at      timestamptz NOT NULL DEFAULT now(),
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    created_by        integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by        integer     REFERENCES app_user (id) ON DELETE SET NULL
);
CREATE INDEX idx_checklist_completion_task ON checklist_completion (work_task_id, completed_at DESC);
CREATE INDEX idx_checklist_completion_day  ON checklist_completion (tenant_id, completed_at DESC);
