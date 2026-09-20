-- ---------------------------------------------------------------------
-- Documents library (PTW, RAMS/HIRA, rescue plan, checklist, standard, TBT)
-- One logical document, many revisions; placements say where it applies.
-- ---------------------------------------------------------------------

CREATE TABLE document (
    id            integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id     integer     REFERENCES tenant (id),  -- NULL = SafeIn5 library (everyone)
    title         text        NOT NULL,
    doc_type      text        NOT NULL
                  CHECK (doc_type IN (
                      'permit_to_work', 'risk_assessment', 'rescue_plan',
                      'checklist', 'standard', 'toolbox_talk', 'other'
                  )),
    -- Exact label from the upload dropdown (LOTOTO, COSHH, lifting plan, …).
    kind_label    text,
    reference     text,                          -- PTW-4471, HOTBINSRA01, IMSF 100
    status        text        NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'approved')),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    created_by    integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by    integer     REFERENCES app_user (id) ON DELETE SET NULL
);
CREATE INDEX idx_document_tenant ON document (tenant_id, doc_type);

CREATE TABLE document_revision (
    id            integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    document_id   integer     NOT NULL REFERENCES document (id) ON DELETE CASCADE,
    revision      text        NOT NULL,          -- v1, v2, v3 (sequential per document)
    s3_key        text        NOT NULL,
    mime_type     text,
    size_bytes    bigint      CHECK (size_bytes IS NULL OR size_bytes >= 0),
    is_current    boolean     NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    created_by    integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by    integer     REFERENCES app_user (id) ON DELETE SET NULL
);
CREATE INDEX idx_document_revision_doc ON document_revision (document_id, created_at DESC);

-- Attach a document to a tenant / site / space / work_task (library = tenant NULL + no rows).
-- Task "Documents" tab (s-attached at3): permit, RAMS, rescue plan, checklist file,
-- plus extra kinds added on the task. Space placements inherit onto every task
-- at that space (inherited = true when copied for display, or resolved in API).
CREATE TABLE document_placement (
    id            integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    document_id   integer     NOT NULL REFERENCES document (id) ON DELETE CASCADE,
    scope_kind    text        NOT NULL CHECK (scope_kind IN ('tenant', 'site', 'space', 'work_task')),
    tenant_id     integer     REFERENCES tenant (id) ON DELETE CASCADE,
    site_id       integer     REFERENCES site (id) ON DELETE CASCADE,
    space_id      integer     REFERENCES space (id) ON DELETE CASCADE,
    work_task_id  integer,    -- FK added after work_task exists
    inherited     boolean     NOT NULL DEFAULT false,  -- shown on task because of space
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    created_by    integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by    integer     REFERENCES app_user (id) ON DELETE SET NULL,
    CHECK (
        (scope_kind = 'tenant'    AND tenant_id IS NOT NULL AND site_id IS NULL AND space_id IS NULL AND work_task_id IS NULL)
     OR (scope_kind = 'site'      AND site_id IS NOT NULL AND space_id IS NULL AND work_task_id IS NULL)
     OR (scope_kind = 'space'     AND space_id IS NOT NULL AND work_task_id IS NULL)
     OR (scope_kind = 'work_task' AND work_task_id IS NOT NULL AND space_id IS NULL)
    )
);
