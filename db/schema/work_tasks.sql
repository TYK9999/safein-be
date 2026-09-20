
-- ---------------------------------------------------------------------
-- Work tasks (permits / work orders / observation buckets).
-- Attachments (s-attached): Job Checklist, Learn 5, Documents, Uncover, Shift.
--   Job Checklist / Learn 5 → work_task_content_prompt (select shared library prompts)
--   Uncover / Shift         → work_task_prompt_setting (task-owned checks)
--   Paperwork               → document_placement
--   Learn 5 visual media    → work_task_learn5_media
-- ---------------------------------------------------------------------

CREATE TABLE work_task (
    id                    integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id             integer     NOT NULL REFERENCES tenant (id),
    site_id               integer     REFERENCES site (id),
    space_id              integer     REFERENCES space (id),
    reference             text        NOT NULL,   -- PTW-4471, WO-2210, or display name
    work_description      text,                   -- Tank cleaning
    status                text        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'archived')),
    permit_required       boolean     NOT NULL DEFAULT false,
    permit_type           text,                   -- Special Permit — Confined Space
    permit_number         text,
    permit_valid_until    timestamptz,
    rams_document_id      integer     REFERENCES document (id) ON DELETE SET NULL,
    rams_reference        text,
    ms_sop_number         text,                   -- Add a task: MS/SOP number
    lead_user_id          integer     REFERENCES app_user (id) ON DELETE SET NULL,
    copied_from_task_id   integer     REFERENCES work_task (id) ON DELETE SET NULL,
    is_template           boolean     NOT NULL DEFAULT false,
    si5_task_code         text,                   -- SI5-TASK-0042 (templates; assigned on publish)
    activity              text,                   -- Template: Confined space work, grinding, …
    starts_at             timestamptz,
    ends_at               timestamptz,
    planned_days          integer,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),
    created_by            integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by            integer     REFERENCES app_user (id) ON DELETE SET NULL
);
CREATE INDEX idx_work_task_tenant ON work_task (tenant_id, status, created_at DESC);
CREATE INDEX idx_work_task_space  ON work_task (space_id, status);
CREATE INDEX idx_work_task_site   ON work_task (site_id, status);
CREATE UNIQUE INDEX idx_work_task_si5_code
    ON work_task (si5_task_code) WHERE si5_task_code IS NOT NULL;

ALTER TABLE document_placement
    ADD CONSTRAINT document_placement_work_task_fk
    FOREIGN KEY (work_task_id) REFERENCES work_task (id) ON DELETE CASCADE;
ALTER TABLE content_placement
    ADD CONSTRAINT content_placement_work_task_fk
    FOREIGN KEY (work_task_id) REFERENCES work_task (id) ON DELETE CASCADE;

CREATE UNIQUE INDEX idx_document_placement_task
    ON document_placement (document_id, work_task_id)
    WHERE work_task_id IS NOT NULL;
CREATE UNIQUE INDEX idx_document_placement_space
    ON document_placement (document_id, space_id)
    WHERE space_id IS NOT NULL;

CREATE UNIQUE INDEX idx_content_placement_task_kind
    ON content_placement (work_task_id, pack_kind)
    WHERE work_task_id IS NOT NULL;
CREATE UNIQUE INDEX idx_content_placement_space_kind
    ON content_placement (space_id, pack_kind)
    WHERE space_id IS NOT NULL;

CREATE TABLE work_task_crew (
    id            integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    work_task_id  integer     NOT NULL REFERENCES work_task (id) ON DELETE CASCADE,
    user_id       integer     NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    created_by    integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by    integer     REFERENCES app_user (id) ON DELETE SET NULL,
    UNIQUE (work_task_id, user_id)
);

-- Shared Job Checklist / Learn 5 prompts selected onto a task (s-attached at1 / at2 list).
-- Prompts live once on content_prompt; many tasks can select the same row.
-- Wording is never copied — only per-task behaviour (critical, mandatory, fail tags, order).
CREATE TABLE work_task_content_prompt (
    id                       integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    work_task_id             integer     NOT NULL REFERENCES work_task (id) ON DELETE CASCADE,
    content_prompt_id        integer     NOT NULL REFERENCES content_prompt (id) ON DELETE CASCADE,
    pack_kind                text        NOT NULL
                             CHECK (pack_kind IN ('job_checklist', 'learn_5')),
    sort_order               integer     NOT NULL DEFAULT 0,
    is_critical              boolean     NOT NULL DEFAULT false,  -- Job Checklist
    is_mandatory             boolean     NOT NULL DEFAULT false,  -- Learn 5 list
    fail_missing_items       jsonb       NOT NULL DEFAULT '[]'::jsonb,  -- Job Checklist fail tags
    tied_checklist_prompt_id integer     REFERENCES content_prompt (id) ON DELETE SET NULL,  -- Learn 5
    created_at               timestamptz NOT NULL DEFAULT now(),
    updated_at               timestamptz NOT NULL DEFAULT now(),
    created_by               integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by               integer     REFERENCES app_user (id) ON DELETE SET NULL,
    UNIQUE (work_task_id, content_prompt_id)
);
CREATE INDEX idx_task_content_prompt_task ON work_task_content_prompt (work_task_id, pack_kind, sort_order);
CREATE INDEX idx_task_content_prompt_prompt ON work_task_content_prompt (content_prompt_id);

CREATE OR REPLACE FUNCTION assert_task_content_prompt_kind()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    v_kind text;
BEGIN
    SELECT p.kind INTO v_kind
    FROM content_prompt cp
    JOIN content_pack p ON p.id = cp.content_pack_id
    WHERE cp.id = NEW.content_prompt_id;
    IF v_kind IS NULL THEN
        RAISE EXCEPTION 'content_prompt % not found', NEW.content_prompt_id;
    END IF;
    IF v_kind NOT IN ('job_checklist', 'learn_5') THEN
        RAISE EXCEPTION 'tasks can only select Job Checklist or Learn 5 library prompts';
    END IF;
    IF NEW.pack_kind <> v_kind THEN
        RAISE EXCEPTION 'work_task_content_prompt.pack_kind (%) must match content_pack.kind (%)',
            NEW.pack_kind, v_kind;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_task_content_prompt_kind
    BEFORE INSERT OR UPDATE OF content_prompt_id, pack_kind ON work_task_content_prompt
    FOR EACH ROW EXECUTE FUNCTION assert_task_content_prompt_kind();

-- Per-task Uncover / Shift checks (s-attached at4 / at5). Not library prompts —
-- wording is edited on the task (and Uncover may be sourced from an open Echo).
CREATE TABLE work_task_prompt_setting (
    id                       integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    work_task_id             integer     NOT NULL REFERENCES work_task (id) ON DELETE CASCADE,
    content_placement_id     integer     REFERENCES content_placement (id) ON DELETE CASCADE,
    pack_kind                text        NOT NULL
                             CHECK (pack_kind IN ('uncover', 'shift')),
    sort_order               integer     NOT NULL DEFAULT 0,
    source                   text        NOT NULL DEFAULT 'custom'
                             CHECK (source IN ('custom', 'echo', 'library')),
    content_prompt_id        integer     REFERENCES content_prompt (id) ON DELETE SET NULL,
    -- Uncover check pulled from an open Echo; FK added after signal exists.
    source_signal_id         integer,
    body_text                text        NOT NULL,
    created_at               timestamptz NOT NULL DEFAULT now(),
    updated_at               timestamptz NOT NULL DEFAULT now(),
    created_by               integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by               integer     REFERENCES app_user (id) ON DELETE SET NULL
);
CREATE INDEX idx_task_prompt_setting_task ON work_task_prompt_setting (work_task_id, pack_kind, sort_order);

-- Learn 5 visual media rows (required vs optional) on a task (s-attached at2 media).
CREATE TABLE work_task_learn5_media (
    id                   integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    work_task_id         integer     NOT NULL REFERENCES work_task (id) ON DELETE CASCADE,
    content_placement_id integer     REFERENCES content_placement (id) ON DELETE CASCADE,
    content_asset_id     integer     NOT NULL REFERENCES content_asset (id) ON DELETE CASCADE,
    row_kind             text        NOT NULL CHECK (row_kind IN ('required', 'optional')),
    sort_order           integer     NOT NULL DEFAULT 0,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now(),
    created_by           integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by           integer     REFERENCES app_user (id) ON DELETE SET NULL,
    UNIQUE (work_task_id, content_asset_id, row_kind)
);
CREATE INDEX idx_task_learn5_media_task ON work_task_learn5_media (work_task_id, row_kind, sort_order);
