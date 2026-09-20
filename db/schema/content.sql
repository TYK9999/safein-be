-- ---------------------------------------------------------------------
-- Content: Job Checklist + Learn 5 (+ Uncover / Shift packs)
-- ---------------------------------------------------------------------

CREATE TABLE content_pack (
    id            integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id     integer     REFERENCES tenant (id),  -- NULL = SafeIn5-authored, shareable
    kind          text        NOT NULL
                  CHECK (kind IN ('job_checklist', 'learn_5', 'uncover', 'shift')),
    title         text        NOT NULL,
    category      text,                          -- Safety / Site / Assets (Learn 5)
    duration_min  integer,
    status        text        NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'published')),
    revision      text,                          -- v1, v2, v3 when published
    published_at  timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    created_by    integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by    integer     REFERENCES app_user (id) ON DELETE SET NULL
);
CREATE INDEX idx_content_pack_tenant ON content_pack (tenant_id, kind, status);

CREATE TABLE content_prompt (
    id               integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    content_pack_id  integer     NOT NULL REFERENCES content_pack (id) ON DELETE CASCADE,
    sort_order       integer     NOT NULL DEFAULT 0,
    body_text        text        NOT NULL,
    -- Library defaults only. Task selection copies behaviour onto
    -- work_task_content_prompt so the same prompt can differ per task.
    is_critical      boolean     NOT NULL DEFAULT false,
    is_mandatory     boolean     NOT NULL DEFAULT false,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    created_by       integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by       integer     REFERENCES app_user (id) ON DELETE SET NULL
);
CREATE INDEX idx_content_prompt_pack ON content_prompt (content_pack_id, sort_order);

CREATE TABLE content_asset (
    id               integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    content_pack_id  integer     NOT NULL REFERENCES content_pack (id) ON DELETE CASCADE,
    s3_key           text        NOT NULL,
    filename         text        NOT NULL,
    mime_type        text        NOT NULL,
    size_bytes       bigint      NOT NULL CHECK (size_bytes >= 0),
    duration_sec     integer,                    -- reels
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    created_by       integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by       integer     REFERENCES app_user (id) ON DELETE SET NULL
);

-- Attach a content pack to a space or a work task.
-- Task "What is attached" (s-attached): Job Checklist, Learn 5, Uncover, Shift.
--   job_checklist / learn_5 → usually work_task (same space, different checks per job)
--   uncover                  → often space (inherited by tasks); can be task-only
--   shift                    → usually work_task
-- One pack of each kind per task / per space (UNIQUE on pack_kind + target).
CREATE TABLE content_placement (
    id               integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    content_pack_id  integer     NOT NULL REFERENCES content_pack (id) ON DELETE CASCADE,
    pack_kind        text        NOT NULL
                     CHECK (pack_kind IN ('job_checklist', 'learn_5', 'uncover', 'shift')),
    scope_kind       text        NOT NULL CHECK (scope_kind IN ('space', 'work_task')),
    space_id         integer     REFERENCES space (id) ON DELETE CASCADE,
    work_task_id     integer,                    -- FK after work_task
    inherited        boolean     NOT NULL DEFAULT false,  -- shown on task from space placement
    -- Task attach screen: Learn 5 list vs visual media. NULL unless pack_kind is learn_5.
    learn5_kind      text
                     CHECK (learn5_kind IS NULL OR learn5_kind IN ('list', 'visual_media')),
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    created_by       integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by       integer     REFERENCES app_user (id) ON DELETE SET NULL,
    CHECK (
        (scope_kind = 'space'     AND space_id IS NOT NULL AND work_task_id IS NULL)
     OR (scope_kind = 'work_task' AND work_task_id IS NOT NULL AND space_id IS NULL)
    ),
    CHECK (learn5_kind IS NULL OR pack_kind = 'learn_5')
);

CREATE OR REPLACE FUNCTION fill_content_placement_pack_kind()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    v_kind text;
BEGIN
    SELECT kind INTO v_kind FROM content_pack WHERE id = NEW.content_pack_id;
    IF v_kind IS NULL THEN
        RAISE EXCEPTION 'content_placement.content_pack_id % not found', NEW.content_pack_id;
    END IF;
    IF NEW.pack_kind IS NULL THEN
        NEW.pack_kind := v_kind;
    ELSIF NEW.pack_kind <> v_kind THEN
        RAISE EXCEPTION 'content_placement.pack_kind (%) must match content_pack.kind (%)',
            NEW.pack_kind, v_kind;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_content_placement_pack_kind
    BEFORE INSERT OR UPDATE OF content_pack_id, pack_kind ON content_placement
