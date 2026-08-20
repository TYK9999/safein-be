-- =====================================================================
-- SafeIn5 MVP -- Migration 0004: LEARNING CONTENT
-- Learn5 items, Learn5 bindings, Learn5 view telemetry, Rescue Plans,
-- and the two deferred foreign keys handed over from 0003.
--
-- Source of truth: SafeIn5-MVP-Architecture.md
--   Sec 2.5 (Learning Content), Sec 3 (Multi-tenancy & RLS),
--   Sec 4.3 (Anonymity: learn5_view is author_token-only),
--   Sec 8 (Outbox taxonomy: learn5.viewed / learn5.completed).
-- Supporting: Dev Pack V9 Sec 8.3 (rescue plan fields) and Sec 8.4
--   (Learn5 delivery options); PRD Sec 5.8; Tender Pack CQA-010.
--
-- Depends on 0001 (tenant/site/sub_site/asset), 0002 (identity) and
-- 0003 (task_type, risk_type, qr_context, qr_code, pulse_template).
--
-- Roles and grants live in 0007_rls_roles.sql. Plain ASCII only.
-- =====================================================================


-- =====================================================================
-- 1. learn5_item
-- ---------------------------------------------------------------------
-- Architecture Sec 2.5. tenant_id is DELIBERATELY NULLABLE: a NULL
-- tenant_id means SafeIn5-global content that every tenant -- including
-- the Community tenant -- can read. This is what CQA-010 ("SafeIn5 will
-- provide initial Learn5 content") requires: 20-30 modules authored once,
-- centrally, and visible everywhere, without cloning a row per tenant.
-- Tenants may additionally author their own private items with tenant_id
-- set. The consequence is that learn5_item needs a different RLS policy
-- shape from every other table in the schema -- see section 6.1.
-- =====================================================================

CREATE TABLE learn5_item (
    id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id           uuid        NULL,

    title               text        NOT NULL,
    summary             text        NULL,
    body_md             text        NULL,

    media_key           text        NULL,
    media_kind          text        NULL,
    external_url        text        NULL,
    delivery_mode       text        NOT NULL DEFAULT 'native',

    risk_type_code      text        NULL,
    task_type_code      text        NULL,
    tags                text[]      NOT NULL DEFAULT '{}'::text[],

    estimated_seconds   integer     NULL,
    version             integer     NOT NULL DEFAULT 1,
    status              text        NOT NULL DEFAULT 'draft',
    published_at        timestamptz NULL,

    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NULL,
    deleted_at          timestamptz NULL,

    CONSTRAINT pk_learn5_item PRIMARY KEY (id),

    CONSTRAINT fk_learn5_item_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenant (id),
    CONSTRAINT fk_learn5_item_risk_type
        FOREIGN KEY (risk_type_code) REFERENCES risk_type (code),
    CONSTRAINT fk_learn5_item_task_type
        FOREIGN KEY (task_type_code) REFERENCES task_type (code),

    CONSTRAINT ck_learn5_item_delivery_mode
        CHECK (delivery_mode IN ('native', 'external')),

    -- PRD Sec 5.8 resolves Dev Pack Sec 8.4's two options: build NATIVE,
    -- retain the EXTERNAL adapter as a fallback. Both shapes live in one
    -- table because an item may be migrated from external to native in
    -- place without re-keying learn5_view rows (the Phase 1 engagement
    -- metric, which must not be orphaned).
    CONSTRAINT ck_learn5_item_external_requires_url
        CHECK (delivery_mode <> 'external' OR external_url IS NOT NULL),

    CONSTRAINT ck_learn5_item_media_kind
        CHECK (media_kind IS NULL
               OR media_kind IN ('image', 'video', 'audio', 'pdf')),

    CONSTRAINT ck_learn5_item_status
        CHECK (status IN ('draft', 'published', 'archived')),

    -- Published content must carry a publication timestamp: the outbox
    -- event learn5.published (Architecture Sec 8) is replayed against it.
    CONSTRAINT ck_learn5_item_published_at
        CHECK (status <> 'published' OR published_at IS NOT NULL),

    CONSTRAINT ck_learn5_item_version_positive
        CHECK (version >= 1),

    -- A "Learn 5" item is by definition short. The upper bound is a
    -- sanity guard against a mis-keyed value, not a product rule.
    CONSTRAINT ck_learn5_item_estimated_seconds
        CHECK (estimated_seconds IS NULL
               OR (estimated_seconds > 0 AND estimated_seconds <= 3600))
);

-- tenant_id IS NULL rows are global, so a plain UNIQUE (tenant_id, ...)
-- would treat every global row as distinct from every other. COALESCE to
-- the nil UUID collapses the global scope into one comparable value.
CREATE UNIQUE INDEX uq_learn5_item_scope_title_version
    ON learn5_item (
        COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
        lower(title),
        version
    )
    WHERE deleted_at IS NULL;

CREATE INDEX idx_learn5_item_tenant_status
    ON learn5_item (tenant_id, status, published_at DESC)
    WHERE deleted_at IS NULL;

-- Global-content lookup: the QR resolve path (Architecture Sec 6.2) and
-- the admin library both need "all global published items" cheaply.
CREATE INDEX idx_learn5_item_global_published
    ON learn5_item (status, published_at DESC)
    WHERE tenant_id IS NULL AND deleted_at IS NULL;

-- Learn5 resolution by risk/task axis.
CREATE INDEX idx_learn5_item_risk_task
    ON learn5_item (risk_type_code, task_type_code)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_learn5_item_tags
    ON learn5_item USING gin (tags);

CREATE TRIGGER trg_learn5_item_updated_at
    BEFORE UPDATE ON learn5_item
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  learn5_item IS
    'Micro-learning content (Dev Pack Sec 8.4, Architecture Sec 2.5). tenant_id NULL means SafeIn5-global content readable by every tenant including Community (CQA-010). Because tenant_id is nullable there is no (id, tenant_id) key, so every FK pointing here is single-column and tenant agreement is enforced by the write path plus RLS.';
COMMENT ON COLUMN learn5_item.tenant_id IS
    'NULL => SafeIn5-global item, readable by all tenants. Non-null => tenant-private item. Drives the special RLS policy on this table (section 6.1).';
COMMENT ON COLUMN learn5_item.body_md IS
    'Markdown body for delivery_mode = native. Rendered client-side; no HTML is stored.';
COMMENT ON COLUMN learn5_item.media_key IS
    'Object-store key of the primary media asset. Not a presigned URL -- URLs are minted per request with a short TTL (Architecture Sec 5).';
COMMENT ON COLUMN learn5_item.media_kind IS
    'Kind of the asset at media_key: image | video | audio | pdf.';
COMMENT ON COLUMN learn5_item.external_url IS
    'Target for delivery_mode = external (Dev Pack Sec 8.4 Option 1). Retained as the fallback adapter per PRD Sec 5.8.';
COMMENT ON COLUMN learn5_item.delivery_mode IS
    'native (content hosted in SafeIn5, PRD Sec 5.8 decision) | external (adapter fallback, Dev Pack Sec 8.4 Option 1).';
COMMENT ON COLUMN learn5_item.risk_type_code IS
    '[SIGNAL] Structured risk vocabulary, not free text -- one of the two grouping axes the future SIGNAL intelligence layer clusters on.';
COMMENT ON COLUMN learn5_item.task_type_code IS
    '[SIGNAL] Structured task vocabulary, not free text -- the second SIGNAL grouping axis.';
COMMENT ON COLUMN learn5_item.tags IS
    '[SIGNAL] Free-form editorial tags. Complements, never replaces, risk_type_code/task_type_code.';
COMMENT ON COLUMN learn5_item.estimated_seconds IS
    'Expected consumption time, shown to the worker before opening and used as the denominator for the Learn5 completion-rate metric (Dev Pack Sec 14).';
COMMENT ON COLUMN learn5_item.version IS
    'Editorial version. Incremented on republish so a learn5_view recorded months ago can be read against the copy that was live at the time.';
COMMENT ON COLUMN learn5_item.deleted_at IS
    'Soft delete. Never hard delete -- learn5_view rows reference this item and the engagement metric must survive content retirement.';


-- =====================================================================
-- 2. learn5_binding
-- ---------------------------------------------------------------------
-- ONE join table with a nullable-target shape, NOT six FK columns on
-- learn5_item. Why:
--   (a) The relationship is many-to-many in both directions. A single
--       item ("Suspended loads and pinch points") is bound to several
--       sub-sites, several assets and a risk type at once; six columns on
--       the item would cap it at one target per kind.
--   (b) tenant_id lives HERE, not on the item. That is the whole point:
--       a GLOBAL item (learn5_item.tenant_id IS NULL) is bound to a
--       specific tenant's sub-site by a tenant-owned binding row. With FK
--       columns on the item, a tenant could not attach global content to
--       its own site without cloning the content.
--   (c) priority is an attribute of the RELATIONSHIP, not of the item.
--   (d) Adding a seventh target kind in Phase 2 is a nullable column and
--       one CHECK edit here.
-- Exactly one target is non-null (ck_learn5_binding_one_target).
-- =====================================================================

CREATE TABLE learn5_binding (
    id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id           uuid        NOT NULL,

    learn5_item_id      uuid        NOT NULL,

    -- Exactly one of the following six is non-null.
    site_id             uuid        NULL,
    sub_site_id         uuid        NULL,
    asset_id            uuid        NULL,
    qr_context_id       uuid        NULL,
    pulse_template_id   uuid        NULL,
    risk_type_code      text        NULL,

    priority            integer     NOT NULL DEFAULT 100,

    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NULL,
    deleted_at          timestamptz NULL,

    CONSTRAINT pk_learn5_binding PRIMARY KEY (id),

    CONSTRAINT fk_learn5_binding_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenant (id),
    -- Single-column: the ITEM may be global (tenant_id IS NULL).
    CONSTRAINT fk_learn5_binding_item
        FOREIGN KEY (learn5_item_id) REFERENCES learn5_item (id),
    -- Composite: the TARGET is always tenant-owned.
    CONSTRAINT fk_learn5_binding_site
        FOREIGN KEY (site_id, tenant_id) REFERENCES site (id, tenant_id),
    CONSTRAINT fk_learn5_binding_sub_site
        FOREIGN KEY (sub_site_id, tenant_id) REFERENCES sub_site (id, tenant_id),
    CONSTRAINT fk_learn5_binding_asset
        FOREIGN KEY (asset_id, tenant_id) REFERENCES asset (id, tenant_id),
    CONSTRAINT fk_learn5_binding_qr_context
        FOREIGN KEY (qr_context_id, tenant_id) REFERENCES qr_context (id, tenant_id),
    -- Single-column: pulse_template may be global.
    CONSTRAINT fk_learn5_binding_pulse_template
        FOREIGN KEY (pulse_template_id) REFERENCES pulse_template (id),
    CONSTRAINT fk_learn5_binding_risk_type
        FOREIGN KEY (risk_type_code) REFERENCES risk_type (code),

    -- The load-bearing constraint of the nullable-target shape.
    CONSTRAINT ck_learn5_binding_one_target
        CHECK (
            num_nonnulls(
                site_id,
                sub_site_id,
                asset_id,
                qr_context_id,
                pulse_template_id,
                risk_type_code
            ) = 1
        ),

    -- Lower number = shown first. Bounded so an editor cannot enter a
    -- value that silently sorts outside the intended band.
    CONSTRAINT ck_learn5_binding_priority
        CHECK (priority BETWEEN 0 AND 1000)
);

-- One live binding per (item, target). COALESCE onto the nil UUID /
-- empty string because five of the six target columns are NULL in every
-- row and NULLs are distinct under a plain UNIQUE constraint.
CREATE UNIQUE INDEX uq_learn5_binding_item_target
    ON learn5_binding (
        learn5_item_id,
        COALESCE(site_id,           '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(sub_site_id,       '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(asset_id,          '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(qr_context_id,     '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(pulse_template_id, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(risk_type_code,    '')
    )
    WHERE deleted_at IS NULL;

-- Resolution indexes. Each is the exact shape of one arm of the
-- "what Learn5 do I show here?" query issued during QR resolve
-- (Architecture Sec 6.2, single-round-trip requirement).
CREATE INDEX idx_learn5_binding_qr_context
    ON learn5_binding (tenant_id, qr_context_id, priority)
    WHERE qr_context_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_learn5_binding_sub_site
    ON learn5_binding (tenant_id, sub_site_id, priority)
    WHERE sub_site_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_learn5_binding_site
    ON learn5_binding (tenant_id, site_id, priority)
    WHERE site_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_learn5_binding_asset
    ON learn5_binding (tenant_id, asset_id, priority)
    WHERE asset_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_learn5_binding_pulse_template
    ON learn5_binding (tenant_id, pulse_template_id, priority)
    WHERE pulse_template_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_learn5_binding_risk_type
    ON learn5_binding (tenant_id, risk_type_code, priority)
    WHERE risk_type_code IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_learn5_binding_item
    ON learn5_binding (tenant_id, learn5_item_id)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_learn5_binding_updated_at
    BEFORE UPDATE ON learn5_binding
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  learn5_binding IS
    'Many-to-many attachment of a learn5_item to exactly one context target (site | sub_site | asset | qr_context | pulse_template | risk_type). One join table with a nullable-target shape beats six FK columns on the item: the relationship is many-to-many, priority is a property of the relationship, and a tenant must be able to bind SafeIn5-global content (learn5_item.tenant_id IS NULL) to its own sites without cloning it.';
COMMENT ON COLUMN learn5_binding.tenant_id IS
    'The binding is always tenant-owned even when the bound item is global. This is what lets global content be surfaced in a tenant context without duplicating the content row.';
COMMENT ON COLUMN learn5_binding.priority IS
    'Display order within a target, ascending (0 = first). Lives on the binding, not the item, because the same item ranks differently in different contexts.';
COMMENT ON COLUMN learn5_binding.risk_type_code IS
    'Risk-type target: binds an item to every context carrying this risk type, so a new confined-space QR inherits the confined-space Learn5 with no extra admin step.';
COMMENT ON COLUMN learn5_binding.pulse_template_id IS
    'Template target. This is the ENFORCED way to attach learning to a PULSE template -- pulse_template.steps[].learn5_item_id is a per-step inline link only and cannot be a foreign key.';
COMMENT ON COLUMN learn5_binding.deleted_at IS
    'Soft delete. Unbinding must be reversible and must not cascade into learn5_view history.';


-- =====================================================================
-- 3. learn5_view
-- ---------------------------------------------------------------------
-- REQUIRED, not optional. "Engagement with PULSE and Learn 5" is a named
-- Phase 1 success metric (Dev Pack Sec 14) and it CANNOT be reconstructed
-- after the fact -- there is no other record anywhere in the system that
-- an item was opened.
--
-- Keyed by author_token ONLY. There is deliberately NO user_id column on
-- this table (Architecture Sec 4.3): the token works identically for a
-- guest scanning a QR with no account and for a signed-in worker in
-- anonymous mode, and one deletion path (destroying the token mapping)
-- clears attributability for both.
-- =====================================================================

CREATE TABLE learn5_view (
    id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id           uuid        NOT NULL,

    learn5_item_id      uuid        NOT NULL,
    author_token        char(32)    NOT NULL,

    source              text        NOT NULL,
    qr_code_id          uuid        NULL,

    started_at          timestamptz NOT NULL DEFAULT now(),
    completed_at        timestamptz NULL,
    dwell_ms            integer     NULL,
    completed           boolean     NOT NULL DEFAULT false,

    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NULL,
    deleted_at          timestamptz NULL,

    CONSTRAINT pk_learn5_view PRIMARY KEY (id),

    CONSTRAINT fk_learn5_view_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenant (id),
    CONSTRAINT fk_learn5_view_item
        FOREIGN KEY (learn5_item_id) REFERENCES learn5_item (id),
    CONSTRAINT fk_learn5_view_qr_code
        FOREIGN KEY (qr_code_id, tenant_id) REFERENCES qr_code (id, tenant_id),

    CONSTRAINT ck_learn5_view_author_token_format
        CHECK (author_token ~ '^[0-9A-Z]{32}$'),

    CONSTRAINT ck_learn5_view_source
        CHECK (source IN ('qr', 'pulse', 'feed', 'search', 'notification')),

    CONSTRAINT ck_learn5_view_completed_at
        CHECK (completed = false OR completed_at IS NOT NULL),

    CONSTRAINT ck_learn5_view_completed_after_start
        CHECK (completed_at IS NULL OR completed_at >= started_at),

    -- Dwell is clamped at 1 hour: a backgrounded PWA tab reports absurd
    -- values and would poison the engagement average.
    CONSTRAINT ck_learn5_view_dwell_ms
        CHECK (dwell_ms IS NULL OR (dwell_ms >= 0 AND dwell_ms <= 3600000))
);

-- Per-item engagement: views, completions, completion rate.
CREATE INDEX idx_learn5_view_item_started
    ON learn5_view (tenant_id, learn5_item_id, started_at DESC)
    WHERE deleted_at IS NULL;

-- Repeat-engagement metric: COUNT(DISTINCT author_token). Mirrors the
-- (author_token, created_at DESC) index on behaviour_signal.
CREATE INDEX idx_learn5_view_author_token
    ON learn5_view (author_token, started_at DESC)
    WHERE deleted_at IS NULL;

-- Attribution of which entry point drives learning engagement.
CREATE INDEX idx_learn5_view_source
    ON learn5_view (tenant_id, source, started_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_learn5_view_qr_code
    ON learn5_view (tenant_id, qr_code_id, started_at DESC)
    WHERE qr_code_id IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER trg_learn5_view_updated_at
    BEFORE UPDATE ON learn5_view
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  learn5_view IS
    'Learn5 engagement telemetry. Required, not optional: "Engagement with PULSE and Learn 5" is a named Phase 1 success metric (Dev Pack Sec 14) and cannot be reconstructed retrospectively. Keyed by author_token only -- there is intentionally no user_id column (Architecture Sec 4.3), so it behaves identically for guests and for anonymous account holders.';
COMMENT ON COLUMN learn5_view.author_token IS
    'Pseudonymous per-user-per-tenant HMAC (Architecture Sec 4.2). The ONLY actor key on this table. Do not add a user_id column -- that would re-identify anonymous learners and break the guest path.';
COMMENT ON COLUMN learn5_view.source IS
    '[SIGNAL] Entry point that surfaced the item: qr | pulse | feed | search | notification. Feeds the learn5.viewed outbox event (Architecture Sec 8, Sense stage).';
COMMENT ON COLUMN learn5_view.qr_code_id IS
    '[SIGNAL] The physical code that led here, when source = qr. Ties learning engagement back to a specific sticker placement (QA-004 placement verification).';
COMMENT ON COLUMN learn5_view.dwell_ms IS
    '[SIGNAL] Client-measured foreground time on the item. Clamped to 1 hour; a backgrounded PWA tab otherwise reports values that poison the average.';
COMMENT ON COLUMN learn5_view.completed IS
    'Materialised completion flag, set when the worker reaches the end of the item. Denormalised so the completion-rate metric is a COUNT with no CASE expression.';


-- =====================================================================
-- 4. rescue_plan
-- ---------------------------------------------------------------------
-- Fields mirror Dev Pack Sec 8.3 exactly: location / asset, immediate
-- actions, roles and responsibilities, required equipment, escalation
-- contacts, version / review date.
--
-- STRUCTURED JSONB, NOT A MARKDOWN BLOB. The mobile rendering must be
-- scannable in an emergency: a worker at a confined-space entry needs
-- "step 3 of the immediate actions" and "the phone number of the on-site
-- rescue lead" as discrete, individually addressable, large-tap-target UI
-- elements. A markdown blob forces the client to parse prose to find
-- them, cannot guarantee ordering, cannot render a tel: link reliably,
-- and cannot be validated at authoring time. Structure is the safety
-- requirement, not a modelling preference.
--
-- Shapes (validated at the API by Zod, shape-guarded here by CHECKs):
--   immediate_actions     [{"seq":1,"action":"...","detail":"..."}]  ORDERED
--   roles_responsibilities[{"role":"...","responsibility":"..."}]
--   required_equipment    [{"item":"...","quantity":"...","location":"..."}]
--   escalation_contacts   [{"name":"...","role":"...","phone":"..."}]
-- =====================================================================

CREATE TABLE rescue_plan (
    id                      uuid        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id               uuid        NOT NULL,

    site_id                 uuid        NULL,
    sub_site_id             uuid        NULL,
    asset_id                uuid        NULL,

    title                   text        NOT NULL,
    location_description    text        NULL,

    immediate_actions       jsonb       NOT NULL DEFAULT '[]'::jsonb,
    roles_responsibilities  jsonb       NOT NULL DEFAULT '[]'::jsonb,
    required_equipment      jsonb       NOT NULL DEFAULT '[]'::jsonb,
    escalation_contacts     jsonb       NOT NULL DEFAULT '[]'::jsonb,

    version                 integer     NOT NULL DEFAULT 1,
    review_date             date        NULL,
    status                  text        NOT NULL DEFAULT 'draft',
    published_at            timestamptz NULL,

    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NULL,
    deleted_at              timestamptz NULL,

    CONSTRAINT pk_rescue_plan PRIMARY KEY (id),

    CONSTRAINT fk_rescue_plan_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenant (id),
    CONSTRAINT fk_rescue_plan_site
        FOREIGN KEY (site_id, tenant_id) REFERENCES site (id, tenant_id),
    CONSTRAINT fk_rescue_plan_sub_site
        FOREIGN KEY (sub_site_id, tenant_id) REFERENCES sub_site (id, tenant_id),
    CONSTRAINT fk_rescue_plan_asset
        FOREIGN KEY (asset_id, tenant_id) REFERENCES asset (id, tenant_id),

    CONSTRAINT ck_rescue_plan_status
        CHECK (status IN ('draft', 'published', 'archived')),

    CONSTRAINT ck_rescue_plan_published_at
        CHECK (status <> 'published' OR published_at IS NOT NULL),

    CONSTRAINT ck_rescue_plan_version_positive
        CHECK (version >= 1),

    -- Every JSONB field is an ARRAY, never an object and never a scalar.
    CONSTRAINT ck_rescue_plan_immediate_actions_array
        CHECK (jsonb_typeof(immediate_actions) = 'array'),
    CONSTRAINT ck_rescue_plan_roles_array
        CHECK (jsonb_typeof(roles_responsibilities) = 'array'),
    CONSTRAINT ck_rescue_plan_equipment_array
        CHECK (jsonb_typeof(required_equipment) = 'array'),
    CONSTRAINT ck_rescue_plan_contacts_array
        CHECK (jsonb_typeof(escalation_contacts) = 'array'),

    -- A published plan is emergency content. It must have at least one
    -- immediate action and at least one escalation contact, or it is a
    -- page that tells a worker nothing during an incident. Drafts are
    -- exempt so authoring can start from an empty form: this table is
    -- admin-authored, so the "zero mandatory fields at capture" rule that
    -- governs behaviour_signal deliberately does NOT apply here.
    CONSTRAINT ck_rescue_plan_published_has_actions
        CHECK (status <> 'published'
               OR jsonb_array_length(immediate_actions) >= 1),
    CONSTRAINT ck_rescue_plan_published_has_contacts
        CHECK (status <> 'published'
               OR jsonb_array_length(escalation_contacts) >= 1)
);

ALTER TABLE rescue_plan
    ADD CONSTRAINT uq_rescue_plan_id_tenant UNIQUE (id, tenant_id);

-- Resolution is most-specific-first: asset, then sub_site, then site,
-- then tenant-wide (all scope columns NULL). One partial index per arm.
CREATE INDEX idx_rescue_plan_asset
    ON rescue_plan (tenant_id, asset_id, status)
    WHERE asset_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_rescue_plan_sub_site
    ON rescue_plan (tenant_id, sub_site_id, status)
    WHERE sub_site_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_rescue_plan_site
    ON rescue_plan (tenant_id, site_id, status)
    WHERE site_id IS NOT NULL AND deleted_at IS NULL;

-- Admin "plans due for review" screen and the staleness-banner query.
CREATE INDEX idx_rescue_plan_review_date
    ON rescue_plan (tenant_id, review_date)
    WHERE status = 'published' AND deleted_at IS NULL;

CREATE UNIQUE INDEX uq_rescue_plan_scope_title_version
    ON rescue_plan (
        tenant_id,
        COALESCE(site_id,     '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(sub_site_id, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(asset_id,    '00000000-0000-0000-0000-000000000000'::uuid),
        lower(title),
        version
    )
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_rescue_plan_updated_at
    BEFORE UPDATE ON rescue_plan
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  rescue_plan IS
    'Task/location-specific emergency response procedure. Fields mirror Dev Pack Sec 8.3 exactly. Structured JSONB rather than a markdown blob because the mobile rendering must be scannable in an emergency -- individual actions, roles, equipment and phone numbers must be addressable UI elements, not prose the client has to parse.';
COMMENT ON COLUMN rescue_plan.site_id IS
    'Scope. Resolution order is most-specific-first: asset_id, then sub_site_id, then site_id, then tenant-wide (all three NULL).';
COMMENT ON COLUMN rescue_plan.location_description IS
    'Free text describing the physical location / access point, per Dev Pack Sec 8.3 "location / asset". Supplements, never replaces, the structured site/sub_site/asset scope.';
COMMENT ON COLUMN rescue_plan.immediate_actions IS
    'ORDERED array of steps: [{"seq":1,"action":"...","detail":"..."}]. Order is safety-critical; it is carried by both array position and an explicit seq key so a reserialising client cannot silently reorder it.';
COMMENT ON COLUMN rescue_plan.roles_responsibilities IS
    'Array of [{"role":"...","responsibility":"..."}] (Dev Pack Sec 8.3 "roles and responsibilities").';
COMMENT ON COLUMN rescue_plan.required_equipment IS
    'Array of [{"item":"...","quantity":"...","location":"..."}] (Dev Pack Sec 8.3 "required equipment").';
COMMENT ON COLUMN rescue_plan.escalation_contacts IS
    'Array of [{"name":"...","role":"...","phone":"..."}] (Dev Pack Sec 8.3 "escalation contacts"). Discrete phone values so the client can render a one-tap tel: link -- the single most time-critical element on the page.';
COMMENT ON COLUMN rescue_plan.version IS
    'Version, per Dev Pack Sec 8.3 "version / review date". Displayed to the worker so a printed copy can be reconciled against the live one.';

-- OPEN SAFETY QUESTION -- unresolved in the source documents; see
-- SafeIn5-MVP-Open-Questions.md (rescue plan authorship / expiry: no
-- document states who approves a plan or what an expired review date
-- does). The schema deliberately does NOT encode an answer: review_date
-- is data, not a gate, and nothing in this migration filters on it.
-- RECOMMENDATION for the application layer: an expired review_date must
-- DISPLAY the plan with a prominent staleness banner, and must NEVER
-- withhold it. Withholding emergency content because an administrative
-- review date lapsed converts a paperwork failure into a safety failure.
COMMENT ON COLUMN rescue_plan.review_date IS
    'Scheduled review date (Dev Pack Sec 8.3). OPEN SAFETY QUESTION: no source document says what an expired review date does. Recommendation, and the behaviour assumed here: an expired plan is still DISPLAYED, with a staleness banner. Never withhold emergency content. This column is deliberately not a display gate anywhere in the schema.';


-- =====================================================================
-- 5. Deferred foreign keys handed over from 0003
-- ---------------------------------------------------------------------
-- These two constraints, and only these two, were listed as deferred at
-- the foot of 0003. Their target tables now exist.
-- =====================================================================

-- 5.1 qr_context -> rescue_plan (composite: both are tenant-scoped).
-- A plan referenced by a live sticker cannot vanish from under it.
-- Rescue plans are soft-deleted, so the FK never blocks an admin delete;
-- it blocks only a genuine hard delete, which is exactly the intent.
ALTER TABLE qr_context
    ADD CONSTRAINT fk_qr_context_rescue_plan
    FOREIGN KEY (rescue_plan_id, tenant_id)
    REFERENCES rescue_plan (id, tenant_id);

CREATE INDEX idx_qr_context_rescue_plan
    ON qr_context (tenant_id, rescue_plan_id)
    WHERE rescue_plan_id IS NOT NULL;

-- 5.2 qr_context -> learn5_item (single-column: the item may be a
-- SafeIn5-global row with tenant_id IS NULL, so there is no
-- (id, tenant_id) key to target. Tenant agreement for tenant-private
-- items is enforced by the admin write path and by RLS on both tables).
ALTER TABLE qr_context
    ADD CONSTRAINT fk_qr_context_learn5_item
    FOREIGN KEY (learn5_item_id) REFERENCES learn5_item (id);

CREATE INDEX idx_qr_context_learn5_item
    ON qr_context (tenant_id, learn5_item_id)
    WHERE learn5_item_id IS NOT NULL;


-- =====================================================================
-- 6. Row-Level Security
-- ---------------------------------------------------------------------
-- Architecture Sec 3.3. ENABLE plus FORCE on every table.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 6.1 learn5_item -- THE DIFFERENT ONE
-- ---------------------------------------------------------------------
-- Every other table in this schema is "your tenant or nothing".
-- learn5_item is "your tenant OR global". The USING clause therefore has
-- a third disjunct, tenant_id IS NULL, which makes SafeIn5-authored
-- global content (CQA-010) readable from inside EVERY tenant session.
-- Without it, the seeded modules would be invisible to everyone and the
-- Learn5 route would be empty at pilot launch.
--
-- The WITH CHECK clause is where this gets dangerous if written
-- carelessly. A naive symmetric policy would let ANY tenant admin insert
-- a row with tenant_id = NULL and thereby publish content into every
-- other tenant on the platform -- a cross-tenant write escalation dressed
-- up as a convenience. So:
--   * a normal session may only write rows carrying ITS OWN tenant_id;
--   * a global row (tenant_id IS NULL) may only be written under
--     app.bypass_rls = 'on', i.e. through the audited runAsSystem helper.
-- This is the ONLY place in the schema where WITH CHECK references
-- bypass_rls, and it is scoped to the NULL-tenant case alone.
ALTER TABLE learn5_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE learn5_item FORCE  ROW LEVEL SECURITY;

CREATE POLICY pol_tenant_isolation_or_global_learn5_item ON learn5_item
    USING (
           current_setting('app.bypass_rls', true) = 'on'
        OR tenant_id IS NULL
        OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
    WITH CHECK (
           tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
        OR (
               tenant_id IS NULL
           AND current_setting('app.bypass_rls', true) = 'on'
           )
    );

COMMENT ON POLICY pol_tenant_isolation_or_global_learn5_item ON learn5_item IS
    'Read: own tenant OR SafeIn5-global (tenant_id IS NULL) OR system bypass. Write: own tenant only, except global rows which require app.bypass_rls (runAsSystem, audited) -- otherwise any tenant admin could publish into every tenant.';

-- ---------------------------------------------------------------------
-- 6.2 learn5_binding / learn5_view / rescue_plan -- standard shape
-- ---------------------------------------------------------------------
ALTER TABLE learn5_binding ENABLE ROW LEVEL SECURITY;
ALTER TABLE learn5_binding FORCE  ROW LEVEL SECURITY;

CREATE POLICY pol_tenant_isolation_learn5_binding ON learn5_binding
    USING (
           current_setting('app.bypass_rls', true) = 'on'
        OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
    WITH CHECK (
        tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    );

COMMENT ON POLICY pol_tenant_isolation_learn5_binding ON learn5_binding IS
    'Standard tenant isolation. Note the asymmetry with learn5_item: the ITEM may be global, but a BINDING never is -- it always belongs to the tenant that chose to surface that item.';

ALTER TABLE learn5_view ENABLE ROW LEVEL SECURITY;
ALTER TABLE learn5_view FORCE  ROW LEVEL SECURITY;

CREATE POLICY pol_tenant_isolation_learn5_view ON learn5_view
    USING (
           current_setting('app.bypass_rls', true) = 'on'
        OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
    WITH CHECK (
        tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    );

COMMENT ON POLICY pol_tenant_isolation_learn5_view ON learn5_view IS
    'Standard tenant isolation. Views of a GLOBAL item are still recorded against the tenant in which the view happened, so engagement reporting stays tenant-scoped even for shared content.';

ALTER TABLE rescue_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE rescue_plan FORCE  ROW LEVEL SECURITY;

CREATE POLICY pol_tenant_isolation_rescue_plan ON rescue_plan
    USING (
           current_setting('app.bypass_rls', true) = 'on'
        OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
    WITH CHECK (
        tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    );

COMMENT ON POLICY pol_tenant_isolation_rescue_plan ON rescue_plan IS
    'Standard tenant isolation. Unauthenticated QR access to a corporate rescue plan is NOT an RLS exception: the guest session resolves app.tenant_id from qr_code.tenant_id, so the guest is already inside the owning tenant context (Architecture Sec 3.6). A rescue plan behind a login is a safety failure; a rescue plan behind the wrong tenant is a data breach. Both are handled here.';

-- =====================================================================
-- End of migration 0004. Roles and grants: see 0007_rls_roles.sql.
-- =====================================================================
