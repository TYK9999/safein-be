-- =====================================================================
-- SafeIn5 MVP -- Migration 0003: CONTEXT & QR
-- Global task/risk vocabularies, PULSE templates, QR contexts, QR codes,
-- QR scan events, and the Context Engine's resolved-context cache.
--
-- Source of truth: SafeIn5-MVP-Architecture.md Sec 2.3, Sec 3, Sec 4.3,
-- Sec 6 (QR resolution flow), Sec 8 (qr.scanned event).
-- Supporting: Dev Pack V9 Sec 8.2 / 8.6 (QR context model).
--
-- Depends on 0001 (tenant, site, sub_site, asset, set_updated_at) and
-- 0002 (user_tenant_membership).
--
-- Deliberately does NOT reference rescue_plan or learn5_item: those are
-- created in 0004, which adds the two deferred foreign keys. The COLUMNS
-- exist here so 0004 is an ALTER ... ADD CONSTRAINT and never an ALTER
-- ... ADD COLUMN against a table that may already hold pilot rows.
--
-- Roles and grants live in 0007_rls_roles.sql. Plain ASCII only.
-- =====================================================================


-- =====================================================================
-- 1. GLOBAL VOCABULARIES -- task_type / risk_type
--
-- Design decision (resolves the "context taxonomy" open question,
-- CRITICAL): Dev Pack Sec 8.2 requires every QR context to carry
-- site/sub-site, task type and risk type. The Open-Questions
-- recommendation is explicit that task_type and risk_type must be
-- STRUCTURED fields, never free text, because they are the GROUP BY keys
-- the future SIGNAL Identify/Gather layer depends on. Free text makes
-- that pattern detection string matching, i.e. unreliable.
--
-- They are modelled as real reference TABLES rather than CHECK-constrained
-- text because they carry presentation data (label, sort_order) the admin
-- UI and the PWA context chip need, and because a client-specific addition
-- during the pilot must be an INSERT, not a migration. Same treatment as
-- classification and workflow_state_def: config-as-data.
--
-- NOT tenant-scoped and therefore NO RLS: global reference data shared by
-- every tenant including Community. Rows are never deleted, only
-- deactivated via is_active -- retiring a code must never orphan a
-- six-month-old qr_context or behaviour_signal that used it.
--
-- NAMING: every referencing column is <axis>_type_code (task_type_code /
-- risk_type_code), not the architecture doc's bare task_type/risk_type.
-- The suffix makes the FK relationship explicit and greppable and is used
-- consistently on qr_context, pulse_template, context_binding,
-- learn5_item, learn5_binding, pulse_session and behaviour_signal. The
-- API/resolve envelope still exposes them as taskType / riskType.
-- =====================================================================

CREATE TABLE task_type (
    code          text        NOT NULL,
    label         text        NOT NULL,
    description   text        NULL,
    sort_order    integer     NOT NULL DEFAULT 100,
    is_active     boolean     NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NULL,

    CONSTRAINT pk_task_type PRIMARY KEY (code),
    CONSTRAINT ck_task_type_code_format CHECK (code ~ '^[a-z][a-z0-9_]{1,49}$')
);

COMMENT ON TABLE  task_type IS
    'Global seeded vocabulary of work-task types (Dev Pack Sec 8.2 QR context dimension "task type"). Not tenant-scoped, no RLS: shared reference data. Never deleted; deactivate with is_active so historic qr_context / behaviour_signal rows keep resolving.';
COMMENT ON COLUMN task_type.code IS
    '[SIGNAL] Stable machine code. This is the value denormalised onto qr_context, pulse_session and behaviour_signal; it must never be renamed once written. One of the two grouping keys Phase-2 pattern detection runs on.';
COMMENT ON COLUMN task_type.label IS
    'Human label rendered in admin and in the PWA context chip ("Brackley North . Lifting Zone 3 . Heavy Lift").';
COMMENT ON COLUMN task_type.sort_order IS 'Display order in admin pickers. Ascending.';
COMMENT ON COLUMN task_type.is_active IS 'false hides the code from new pickers but leaves every existing reference valid.';

CREATE TABLE risk_type (
    code          text        NOT NULL,
    label         text        NOT NULL,
    description   text        NULL,
    sort_order    integer     NOT NULL DEFAULT 100,
    is_active     boolean     NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NULL,

    CONSTRAINT pk_risk_type PRIMARY KEY (code),
    CONSTRAINT ck_risk_type_code_format CHECK (code ~ '^[a-z][a-z0-9_]{1,49}$')
);

COMMENT ON TABLE  risk_type IS
    'Global seeded vocabulary of hazard/risk types (Dev Pack Sec 8.2 QR context dimension "risk type"). Not tenant-scoped, no RLS. Never deleted; deactivate with is_active.';
COMMENT ON COLUMN risk_type.code IS
    '[SIGNAL] Stable machine code, denormalised onto qr_context, pulse_template, learn5_item and behaviour_signal. The primary axis of Phase-2 pattern detection.';
COMMENT ON COLUMN risk_type.label IS 'Human label for admin pickers and the PWA context chip.';
COMMENT ON COLUMN risk_type.is_active IS 'false hides the code from new pickers but leaves every existing reference valid.';

CREATE TRIGGER trg_task_type_updated_at
    BEFORE UPDATE ON task_type
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_risk_type_updated_at
    BEFORE UPDATE ON risk_type
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---- Seed: task_type ------------------------------------------------
INSERT INTO task_type (code, label, sort_order) VALUES
    ('heavy_lift',            'Heavy Lift',            10),
    ('confined_space_entry',  'Confined Space Entry',  20),
    ('isolation',             'Isolation',             30),
    ('working_at_height',     'Working at Height',     40),
    ('excavation',            'Excavation',            50),
    ('plant_operation',       'Plant Operation',       60),
    ('maintenance',           'Maintenance',           70),
    ('other',                 'Other',                 999);

-- ---- Seed: risk_type ------------------------------------------------
INSERT INTO risk_type (code, label, sort_order) VALUES
    ('suspended_load',        'Suspended Load',        10),
    ('confined_space',        'Confined Space',        20),
    ('dropped_object',        'Dropped Object',        30),
    ('pinch_point',           'Pinch Point',           40),
    ('fall_from_height',      'Fall from Height',      50),
    ('engulfment',            'Engulfment',            60),
    ('vehicle_interaction',   'Vehicle Interaction',   70),
    ('energy_release',        'Energy Release',        80),
    ('other',                 'Other',                 999);


-- =====================================================================
-- 2. pulse_template
--
-- Created before qr_context because qr_context.pulse_template_id
-- references it.
--
-- tenant_id is NULLABLE: NULL means a SafeIn5-global template usable by
-- every tenant including Community (Architecture Sec 2.3, same pattern as
-- learn5_item). Consequence for RLS: the USING clause must also admit
-- tenant_id IS NULL, and the WITH CHECK deliberately does NOT -- an
-- application connection can never create or convert a row into a global
-- template; only the migrator or an audited runAsSystem path may.
--
-- Because tenant_id is nullable there is no (id, tenant_id) unique key
-- here, so referencing columns (qr_context.pulse_template_id,
-- learn5_binding.pulse_template_id) use a single-column FK and rely on the
-- application/RLS pair for tenant agreement. That asymmetry is the price
-- of shared global content and is deliberate.
-- =====================================================================

CREATE TABLE pulse_template (
    id                uuid        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id         uuid        NULL,
    name              text        NOT NULL,
    description       text        NULL,
    steps             jsonb       NOT NULL DEFAULT '[]'::jsonb,
    risk_type_code    text        NULL,
    task_type_code    text        NULL,
    version           integer     NOT NULL DEFAULT 1,
    status            text        NOT NULL DEFAULT 'draft',
    published_at      timestamptz NULL,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NULL,
    deleted_at        timestamptz NULL,

    CONSTRAINT pk_pulse_template PRIMARY KEY (id),
    CONSTRAINT fk_pulse_template_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenant (id),
    CONSTRAINT fk_pulse_template_risk_type
        FOREIGN KEY (risk_type_code) REFERENCES risk_type (code),
    CONSTRAINT fk_pulse_template_task_type
        FOREIGN KEY (task_type_code) REFERENCES task_type (code),
    CONSTRAINT ck_pulse_template_status
        CHECK (status IN ('draft', 'active', 'archived')),
    CONSTRAINT ck_pulse_template_version_positive
        CHECK (version >= 1),
    -- steps must be a jsonb ARRAY, empty (skeleton at creation) or exactly 5.
    CONSTRAINT ck_pulse_template_steps_is_array_of_5
        CHECK (
            jsonb_typeof(steps) = 'array'
            AND (
                   steps = '[]'::jsonb
                OR jsonb_array_length(steps) = 5
            )
        ),
    -- P-U-L-S-E, in order. Written as five positional comparisons rather
    -- than a jsonpath so the expression is unambiguously IMMUTABLE and
    -- readable in a diff.
    CONSTRAINT ck_pulse_template_steps_keys_pulse
        CHECK (
            steps = '[]'::jsonb
            OR (
                    steps -> 0 ->> 'key' = 'P'
                AND steps -> 1 ->> 'key' = 'U'
                AND steps -> 2 ->> 'key' = 'L'
                AND steps -> 3 ->> 'key' = 'S'
                AND steps -> 4 ->> 'key' = 'E'
            )
        ),
    -- An active template must actually have its 5 steps; drafts may not.
    CONSTRAINT ck_pulse_template_active_requires_steps
        CHECK (status <> 'active' OR jsonb_array_length(steps) = 5)
);

CREATE UNIQUE INDEX uq_pulse_template_scope_name_version
    ON pulse_template (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name), version)
    WHERE deleted_at IS NULL;
COMMENT ON INDEX uq_pulse_template_scope_name_version IS
    'Name+version unique within a tenant, and separately within the global (tenant_id IS NULL) namespace. COALESCE to the nil UUID because NULLs would otherwise never collide.';

CREATE INDEX idx_pulse_template_tenant_risk_status
    ON pulse_template (tenant_id, risk_type_code, status)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_pulse_template_global_risk_status
    ON pulse_template (risk_type_code, status)
    WHERE tenant_id IS NULL AND deleted_at IS NULL;

CREATE TRIGGER trg_pulse_template_updated_at
    BEFORE UPDATE ON pulse_template
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  pulse_template IS
    'PULSE prompt set (Architecture Sec 2.3, WRK-005 contextual PULSE prompts). One row = one versioned set of the five P/U/L/S/E steps. Referenced by qr_context.pulse_template_id and resolved by GET /v1/pulse/templates/resolve.';
COMMENT ON COLUMN pulse_template.tenant_id IS
    'NULL means a SafeIn5-global template available to every tenant (including Community). Non-NULL means tenant-private. RLS USING admits both; RLS WITH CHECK admits only the caller tenant, so the app role cannot mint global templates.';
COMMENT ON COLUMN pulse_template.steps IS
    'Ordered jsonb array of exactly 5 objects keyed P|U|L|S|E: [{"key":"P","heading":"...","prompt":"...","learn5_item_id":"<uuid>"}, ...]. steps[].learn5_item_id CANNOT be a foreign key (nested in jsonb); it is existence- and tenant-checked in the same transaction on write and degrades to a missing link on read. For an ENFORCED template-to-Learn5 relationship use learn5_binding.pulse_template_id (0004), which is a real FK.';
COMMENT ON COLUMN pulse_template.risk_type_code IS
    '[SIGNAL] Risk this template is written for; drives GET /v1/pulse/templates/resolve fallback when a qr_context has no explicit template.';
COMMENT ON COLUMN pulse_template.task_type_code IS
    '[SIGNAL] Optional secondary resolution axis. Symmetrical with risk_type_code; resolution prefers risk_type_code.';
COMMENT ON COLUMN pulse_template.version IS
    'Monotonic per (tenant scope, name). Editing a published template creates a new version row rather than mutating history, so a six-month-old pulse_session can be read against the prompts actually shown.';
COMMENT ON COLUMN pulse_template.status IS
    'draft | active | archived. text + CHECK, never a PG ENUM, so Phase 2 adds a state with an ALTER CHECK.';
COMMENT ON COLUMN pulse_template.deleted_at IS
    'Soft delete. A template referenced by a historic pulse_session must remain readable.';


-- =====================================================================
-- 3. qr_context
--
-- Deliberately SEPARATE from qr_code (Architecture Sec 2.3). Two reasons,
-- both operational:
--   1. ~30 physical codes in the pilot may share far fewer logical
--      contexts.
--   2. Re-pointing a physical sticker (this barrier now guards a
--      different task/asset) must be an UPDATE of qr_code.qr_context_id --
--      NOT a reprint and a site visit.
--
-- rescue_plan_id and learn5_item_id are declared here WITHOUT their
-- foreign keys; 0004 adds fk_qr_context_rescue_plan and
-- fk_qr_context_learn5_item once those tables exist. This is the entire
-- deferred-FK handoff between 0003 and 0004.
-- =====================================================================

CREATE TABLE qr_context (
    id                    uuid        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id             uuid        NOT NULL,
    name                  text        NOT NULL,
    description           text        NULL,
    site_id               uuid        NULL,
    sub_site_id           uuid        NULL,
    asset_id              uuid        NULL,
    task_type_code        text        NULL,
    risk_type_code        text        NULL,
    destinations          jsonb       NOT NULL DEFAULT '[]'::jsonb,
    default_destination   text        NULL,
    pulse_template_id     uuid        NULL,
    rescue_plan_id        uuid        NULL,   -- FK added in 0004
    learn5_item_id        uuid        NULL,   -- FK added in 0004
    context_version       integer     NOT NULL DEFAULT 1,
    status                text        NOT NULL DEFAULT 'draft',
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NULL,
    deleted_at            timestamptz NULL,

    CONSTRAINT pk_qr_context PRIMARY KEY (id),
    CONSTRAINT fk_qr_context_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenant (id),
    -- Composite FKs: a context can only point at scope rows in its own
    -- tenant. RLS cannot catch cross-tenant referential drift, because
    -- both rows are individually valid.
    CONSTRAINT fk_qr_context_site
        FOREIGN KEY (site_id, tenant_id) REFERENCES site (id, tenant_id),
    CONSTRAINT fk_qr_context_sub_site
        FOREIGN KEY (sub_site_id, tenant_id) REFERENCES sub_site (id, tenant_id),
    CONSTRAINT fk_qr_context_asset
        FOREIGN KEY (asset_id, tenant_id) REFERENCES asset (id, tenant_id),
    CONSTRAINT fk_qr_context_task_type
        FOREIGN KEY (task_type_code) REFERENCES task_type (code),
    CONSTRAINT fk_qr_context_risk_type
        FOREIGN KEY (risk_type_code) REFERENCES risk_type (code),
    -- Single-column: pulse_template.tenant_id is nullable (global
    -- templates), so no (id, tenant_id) key exists to target.
    CONSTRAINT fk_qr_context_pulse_template
        FOREIGN KEY (pulse_template_id) REFERENCES pulse_template (id),
    CONSTRAINT ck_qr_context_status
        CHECK (status IN ('draft', 'active', 'archived')),
    CONSTRAINT ck_qr_context_destinations_is_array
        CHECK (jsonb_typeof(destinations) = 'array'),
    CONSTRAINT ck_qr_context_default_destination
        CHECK (default_destination IS NULL
               OR default_destination IN ('pulse', 'rescue_plan', 'learn5', 'feed', 'capture')),
    CONSTRAINT ck_qr_context_version_positive
        CHECK (context_version >= 1),
    -- An active context must resolve to at least one destination,
    -- otherwise a scanned sticker renders a blank page (Sec 6.2 rule 4).
    CONSTRAINT ck_qr_context_active_requires_destination
        CHECK (status <> 'active' OR jsonb_array_length(destinations) >= 1)
);

ALTER TABLE qr_context
    ADD CONSTRAINT uq_qr_context_id_tenant UNIQUE (id, tenant_id);

CREATE INDEX idx_qr_context_tenant_status
    ON qr_context (tenant_id, status)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_qr_context_tenant_site
    ON qr_context (tenant_id, site_id, sub_site_id)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_qr_context_tenant_asset
    ON qr_context (tenant_id, asset_id)
    WHERE deleted_at IS NULL AND asset_id IS NOT NULL;

CREATE INDEX idx_qr_context_tenant_taxonomy
    ON qr_context (tenant_id, risk_type_code, task_type_code)
    WHERE deleted_at IS NULL;
COMMENT ON INDEX idx_qr_context_tenant_taxonomy IS
    '[SIGNAL] Supports "which contexts carry this risk" rollups and Learn5/PULSE fallback resolution by taxonomy.';

CREATE INDEX idx_qr_context_pulse_template
    ON qr_context (pulse_template_id)
    WHERE pulse_template_id IS NOT NULL;

CREATE TRIGGER trg_qr_context_updated_at
    BEFORE UPDATE ON qr_context
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  qr_context IS
    'Resolved-destination definition for a QR entry point (Dev Pack Sec 8.2, Architecture Sec 2.3). Deliberately separate from qr_code so a physical sticker can be re-pointed by UPDATEing qr_code.qr_context_id -- no reprint, no site visit -- and so many codes can share one context.';
COMMENT ON COLUMN qr_context.name IS 'Admin-facing name, e.g. "Heavy lift - Lifting Zone 3".';
COMMENT ON COLUMN qr_context.site_id IS 'Nullable. Dev Pack Sec 8.2 context dimension. Denormalised into the resolve envelope and into every context_snapshot.';
COMMENT ON COLUMN qr_context.sub_site_id IS 'Nullable. Sub-site (area / zone / task_zone / asset_group) dimension.';
COMMENT ON COLUMN qr_context.asset_id IS 'Nullable. The "Asset ID = spreader beam" dimension; the GROUP BY that carries the flagship supervisor insight.';
COMMENT ON COLUMN qr_context.task_type_code IS
    '[SIGNAL] FK to the global task_type vocabulary. Named *_code rather than the architecture doc''s bare "task_type" so the FK relationship is explicit and greppable; the resolve envelope still exposes it as taskType.';
COMMENT ON COLUMN qr_context.risk_type_code IS
    '[SIGNAL] FK to the global risk_type vocabulary. See task_type_code for the naming rationale.';
COMMENT ON COLUMN qr_context.destinations IS
    'Ordered jsonb array of {"type":"pulse|rescue_plan|learn5|feed|capture","ref":"<uuid>","label":"..."} (Dev Pack Sec 8.6: one QR -> survey + rescue plan + PULSE + Learn5). Order is the render order in the resolve envelope. "ref" is intentionally NOT FK-enforced -- it is polymorphic across pulse_template, rescue_plan and learn5_item. Replacement controls: same-transaction validation on write, resolve-time LEFT JOIN with silent omission on read (never 404 a printed code), soft-delete-only content, and a nightly worker integrity report. The PRIMARY destination of each kind is duplicated into the real FK columns pulse_template_id / rescue_plan_id / learn5_item_id.';
COMMENT ON COLUMN qr_context.default_destination IS
    'Which destination auto-opens after a scan (normally "pulse"). Matched by "type" against destinations[]; NULL means the PWA renders the destination list without auto-navigating.';
COMMENT ON COLUMN qr_context.pulse_template_id IS
    'Contextual PULSE prompts (WRK-005). Redundant with a destinations[] entry of type "pulse" and deliberately so: the resolver reads this column in the single indexed join rather than parsing jsonb.';
COMMENT ON COLUMN qr_context.rescue_plan_id IS
    'Primary rescue plan destination (Dev Pack Sec 8.3). Column declared in 0003, foreign key fk_qr_context_rescue_plan added in 0004 once rescue_plan exists. Same read-path rationale as pulse_template_id.';
COMMENT ON COLUMN qr_context.learn5_item_id IS
    'Primary Learn5 destination. Column declared in 0003, foreign key fk_qr_context_learn5_item added in 0004. Additional Learn5 items attach through learn5_binding (qr_context_id target).';
COMMENT ON COLUMN qr_context.context_version IS
    '[SIGNAL] Incremented by the application on every edit to the context definition. Lets a six-month-old signal be interpreted against the context definition in force at capture time; the value is copied into every context_snapshot. Backfill-impossible if omitted.';
COMMENT ON COLUMN qr_context.status IS
    'draft | active | archived. Note the physical CODE has its own status (qr_code.status); this one governs the logical context.';
COMMENT ON COLUMN qr_context.deleted_at IS
    'Soft delete only. A deleted context must still resolve for audit and for historic context_snapshot interpretation.';


-- =====================================================================
-- 4. qr_code -- the physical sticker
-- =====================================================================

CREATE TABLE qr_code (
    id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id           uuid        NOT NULL,
    token               char(12)    NOT NULL,
    label               text        NOT NULL,
    qr_context_id       uuid        NULL,
    status              text        NOT NULL DEFAULT 'draft',
    sticker_serial      text        NULL,
    verified_at         timestamptz NULL,
    verified_by_membership_id uuid  NULL,
    printed_asset_url   text        NULL,
    scan_count          bigint      NOT NULL DEFAULT 0,
    last_scanned_at     timestamptz NULL,
    activated_at        timestamptz NULL,
    revoked_at          timestamptz NULL,
    revoked_reason      text        NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NULL,
    deleted_at          timestamptz NULL,

    CONSTRAINT pk_qr_code PRIMARY KEY (id),
    CONSTRAINT uq_qr_code_token UNIQUE (token),
    CONSTRAINT fk_qr_code_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenant (id),
    CONSTRAINT fk_qr_code_qr_context
        FOREIGN KEY (qr_context_id, tenant_id) REFERENCES qr_context (id, tenant_id),
    -- Single-column with ON DELETE SET NULL, unlike the composite FKs
    -- used elsewhere: GDPR erasure DELETEs membership rows, and a
    -- composite SET NULL would also null tenant_id, which is NOT NULL.
    CONSTRAINT fk_qr_code_verified_by
        FOREIGN KEY (verified_by_membership_id)
        REFERENCES user_tenant_membership (id) ON DELETE SET NULL,
    CONSTRAINT ck_qr_code_status
        CHECK (status IN ('draft', 'active', 'inactive', 'revoked')),
    -- Crockford base32: digits plus A-Z excluding I, L, O and U.
    -- Stored upper-case; the resolver upper-cases the path segment first.
    CONSTRAINT ck_qr_code_token_crockford
        CHECK (token ~ '^[0-9A-HJKMNP-TV-Z]{12}$'),
    CONSTRAINT ck_qr_code_scan_count_non_negative
        CHECK (scan_count >= 0),
    -- An active sticker must point somewhere; a scan of an active code
    -- with no context is the one outcome the resolver cannot render well.
    CONSTRAINT ck_qr_code_active_requires_context
        CHECK (status <> 'active' OR qr_context_id IS NOT NULL),
    CONSTRAINT ck_qr_code_revoked_has_timestamp
        CHECK (status <> 'revoked' OR revoked_at IS NOT NULL),
    -- One-directional deliberately, NOT a strict pair: an erasure that
    -- nulls verified_by_membership_id must leave verified_at standing.
    -- The physical verification still happened; only the attribution is
    -- gone. A strict "both or neither" pair would make the erasure fail.
    CONSTRAINT ck_qr_code_verified_by_requires_verified_at
        CHECK (verified_by_membership_id IS NULL OR verified_at IS NOT NULL)
);

ALTER TABLE qr_code
    ADD CONSTRAINT uq_qr_code_id_tenant UNIQUE (id, tenant_id);

CREATE INDEX idx_qr_code_tenant_status
    ON qr_code (tenant_id, status)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_qr_code_qr_context
    ON qr_code (qr_context_id)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_qr_code_tenant_last_scanned
    ON qr_code (tenant_id, last_scanned_at DESC NULLS LAST)
    WHERE deleted_at IS NULL;

-- Note: no separate index on token -- uq_qr_code_token is the unique
-- btree the Sec 6.2 "one query, one round trip" resolve path scans.

CREATE TRIGGER trg_qr_code_updated_at
    BEFORE UPDATE ON qr_code
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  qr_code IS
    'One physical printed QR sticker (Architecture Sec 2.3 / Sec 6). Points at a qr_context, which is what makes re-pointing a sticker an UPDATE rather than a reprint. ~30 rows in the pilot.';
COMMENT ON COLUMN qr_code.token IS
    'THE URL PATH SEGMENT: https://s5.app/q/<token>. 12 chars of Crockford base32 (no I/L/O/U -- no ambiguity, no accidental words), 60 bits of CSPRNG entropy, case-insensitive so it doubles as a human-typed fallback. Opaque: it carries no signature and no expiry, because a token that expires is a sticker that must be reprinted. All authority lives in qr_code.status, which is server-side and instantly revocable.';
COMMENT ON COLUMN qr_code.label IS 'Human name in the admin list, e.g. "Lifting Zone 3 barrier".';
COMMENT ON COLUMN qr_code.status IS
    'draft | active | inactive | revoked. REVOKED IS NOT DELETED. RESOLVER CONTRACT (Sec 6.2 hard rule 4): unknown token -> 200 {status:"unknown"}; inactive -> 200 {status:"inactive"}; revoked -> 200 {status:"retired", fallback:{siteName}}. Never 404 a physical safety sticker. Because unknown and revoked are distinguishable only if the row survives, revoked rows are NEVER deleted and deleted_at is never set on a revoked code that is still physically mounted.';
COMMENT ON COLUMN qr_code.qr_context_id IS
    'Nullable while status=draft (token minted before the admin binds destinations, Sec 6.3). Re-point the sticker by UPDATEing this column.';
COMMENT ON COLUMN qr_code.sticker_serial IS
    'Optional physical inventory serial, matching the additive ?s=<sticker_serial> query param. Never authoritative for resolution; logged for QA-004 placement verification.';
COMMENT ON COLUMN qr_code.verified_at IS
    'QA-004 "QR tested/active": set when someone has physically scanned the mounted sticker and confirmed it routes correctly.';
COMMENT ON COLUMN qr_code.verified_by_membership_id IS
    'Membership that performed the physical verification. Not anonymous -- QR verification is an admin/supervisor action (Architecture Sec 4.3).';
COMMENT ON COLUMN qr_code.printed_asset_url IS
    'Object-store key of the generated print-ready PNG/SVG (qrcode lib, ECC level H for mud, abrasion and UV).';
COMMENT ON COLUMN qr_code.scan_count IS
    'Denormalised counter, incremented fire-and-forget on resolve. The authoritative per-scan record is qr_scan_event below.';
COMMENT ON COLUMN qr_code.last_scanned_at IS
    'Denormalised. Powers the admin "never scanned since printing" placement-check list.';
COMMENT ON COLUMN qr_code.revoked_reason IS
    'Why the sticker was retired. Never shown publicly; shown in admin and copied into the audit_log entry.';


-- =====================================================================
-- 5. qr_scan_event -- the authoritative per-scan record  [SIGNAL]
--
-- ANONYMITY SHAPE (Architecture Sec 4.3): keyed by author_token ONLY.
-- There is deliberately NO user_id column on this table, and there never
-- may be one. Guests carry a token, members carry a token, and one
-- deletion path (destroying the token mapping) clears attributability for
-- both. Append-only in practice; the API only ever INSERTs.
-- =====================================================================

CREATE TABLE qr_scan_event (
    id                     uuid        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id              uuid        NOT NULL,
    qr_code_id             uuid        NOT NULL,
    qr_context_id          uuid        NULL,
    author_token           char(32)    NOT NULL,
    is_first_scan_for_token boolean    NOT NULL DEFAULT false,
    entry_point            text        NOT NULL DEFAULT 'qr',
    sticker_serial         text        NULL,
    occurred_at            timestamptz NOT NULL DEFAULT now(),
    created_at             timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT pk_qr_scan_event PRIMARY KEY (id),
    CONSTRAINT fk_qr_scan_event_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenant (id),
    CONSTRAINT fk_qr_scan_event_qr_code
        FOREIGN KEY (qr_code_id, tenant_id) REFERENCES qr_code (id, tenant_id),
    CONSTRAINT fk_qr_scan_event_qr_context
        FOREIGN KEY (qr_context_id, tenant_id) REFERENCES qr_context (id, tenant_id),
    CONSTRAINT ck_qr_scan_event_author_token_format
        CHECK (author_token ~ '^[0-9A-Z]{32}$'),
    CONSTRAINT ck_qr_scan_event_entry_point
        CHECK (entry_point IN ('qr', 'manual_code', 'deep_link'))
);

CREATE INDEX idx_qr_scan_event_tenant_code_occurred
    ON qr_scan_event (tenant_id, qr_code_id, occurred_at DESC);

CREATE INDEX idx_qr_scan_event_author_token
    ON qr_scan_event (author_token, occurred_at DESC);

CREATE INDEX idx_qr_scan_event_tenant_occurred
    ON qr_scan_event (tenant_id, occurred_at DESC);

COMMENT ON TABLE  qr_scan_event IS
    '[SIGNAL] Authoritative per-scan record behind the qr.scanned outbox event (Architecture Sec 6.2 step 4, Sec 8 Sense stage). QR scans are a named Phase 1 success metric and cannot be reconstructed from the denormalised qr_code.scan_count. KEYED BY author_token ONLY -- no user_id column exists on this table and none may be added (Architecture Sec 4.3).';
COMMENT ON COLUMN qr_scan_event.author_token IS
    'The scanner''s pseudonym. Guest or member, same shape. The ONLY actor key on this table.';
COMMENT ON COLUMN qr_scan_event.qr_context_id IS
    'The context the code resolved to AT SCAN TIME. Stored alongside qr_code_id so a later re-point of the sticker does not retroactively change what a historical scan meant.';
COMMENT ON COLUMN qr_scan_event.is_first_scan_for_token IS
    '[SIGNAL] True on this token''s first ever scan of this code. Materialised at write time because it is a cheap flag now and an expensive window function later.';
COMMENT ON COLUMN qr_scan_event.entry_point IS
    '[SIGNAL] qr (camera) | manual_code (typed the human-readable fallback) | deep_link. Distinguishing the typed fallback is how "the sticker is unreadable in the field" becomes measurable rather than anecdotal.';
COMMENT ON COLUMN qr_scan_event.sticker_serial IS
    'Additive ?s=<serial> param captured for QA-004 placement verification. Never authoritative for resolution.';


-- =====================================================================
-- 6. context_binding -- the Context Engine's resolved-context cache
--
-- Answers WRK-015/016: scanning another QR updates the operative context,
-- and everything downstream (feed filter, capture context, Learn5
-- selection) follows automatically instead of each caller re-deriving it.
--
-- STALENESS RULE: a binding is valid until expires_at, default
-- now() + 8 hours, approximately one shift. Past expires_at the binding is
-- treated as ABSENT, not as wrong: the Context Engine falls back to
-- (a) the actor's user_site_assignment, then (b) manual selection. It is
-- never silently extended, because a stale binding would tag a signal
-- captured on Tuesday with Monday's sub-site -- a data-quality failure
-- that is invisible at capture and uncorrectable afterwards. Expired rows
-- are retained rather than purged: [SIGNAL] the sequence of bindings per
-- actor is the movement trace the Gather stage consumes.
-- =====================================================================

CREATE TABLE context_binding (
    id                uuid        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id         uuid        NOT NULL,
    actor_kind        text        NOT NULL,
    actor_ref         uuid        NOT NULL,
    source            text        NOT NULL,
    site_id           uuid        NULL,
    sub_site_id       uuid        NULL,
    asset_id          uuid        NULL,
    qr_code_id        uuid        NULL,
    qr_context_id     uuid        NULL,
    task_type_code    text        NULL,
    risk_type_code    text        NULL,
    context_snapshot  jsonb       NULL,
    bound_at          timestamptz NOT NULL DEFAULT now(),
    expires_at        timestamptz NOT NULL DEFAULT (now() + interval '8 hours'),
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NULL,
    deleted_at        timestamptz NULL,

    CONSTRAINT pk_context_binding PRIMARY KEY (id),
    CONSTRAINT fk_context_binding_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenant (id),
    CONSTRAINT fk_context_binding_site
        FOREIGN KEY (site_id, tenant_id) REFERENCES site (id, tenant_id),
    CONSTRAINT fk_context_binding_sub_site
        FOREIGN KEY (sub_site_id, tenant_id) REFERENCES sub_site (id, tenant_id),
    CONSTRAINT fk_context_binding_asset
        FOREIGN KEY (asset_id, tenant_id) REFERENCES asset (id, tenant_id),
    CONSTRAINT fk_context_binding_qr_code
        FOREIGN KEY (qr_code_id, tenant_id) REFERENCES qr_code (id, tenant_id),
    CONSTRAINT fk_context_binding_qr_context
        FOREIGN KEY (qr_context_id, tenant_id) REFERENCES qr_context (id, tenant_id),
    CONSTRAINT fk_context_binding_task_type
        FOREIGN KEY (task_type_code) REFERENCES task_type (code),
    CONSTRAINT fk_context_binding_risk_type
        FOREIGN KEY (risk_type_code) REFERENCES risk_type (code),
    CONSTRAINT ck_context_binding_actor_kind
        CHECK (actor_kind IN ('user', 'guest')),
    CONSTRAINT ck_context_binding_source
        CHECK (source IN ('qr', 'geo', 'manual', 'assignment')),
    CONSTRAINT ck_context_binding_qr_source_has_code
        CHECK (source <> 'qr' OR qr_code_id IS NOT NULL),
    CONSTRAINT ck_context_binding_expiry_after_bound
        CHECK (expires_at > bound_at),
    CONSTRAINT ck_context_binding_has_scope
        CHECK (site_id IS NOT NULL OR sub_site_id IS NOT NULL OR asset_id IS NOT NULL)
);

-- One live binding per actor per tenant: "scan another QR overwrites the
-- binding" is implemented as an UPSERT on this key, not an INSERT.
CREATE UNIQUE INDEX uq_context_binding_actor_live
    ON context_binding (tenant_id, actor_kind, actor_ref)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_context_binding_expires_at
    ON context_binding (expires_at)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_context_binding_qr_code
    ON context_binding (qr_code_id)
    WHERE qr_code_id IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER trg_context_binding_updated_at
    BEFORE UPDATE ON context_binding
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  context_binding IS
    'Context Engine cache: "given this actor and this entry point, what is the operative context?" (Architecture Sec 1.2 module 8, Sec 2.3). Answers WRK-015/016 -- scanning another QR UPSERTs this one row and the feed filter, capture context and Learn5 selection all follow, instead of five callers re-deriving context. STALENESS: valid until expires_at (default now()+8h, one shift); past that it is treated as ABSENT and the engine falls back to user_site_assignment, then manual. Never silently extended.';
COMMENT ON COLUMN context_binding.actor_kind IS
    'user | guest. Discriminator for the polymorphic actor_ref. Deliberately not a FK pair, so guests and members share one cache and one deletion path.';
COMMENT ON COLUMN context_binding.actor_ref IS
    'app_user.id when actor_kind=user, guest_session.id when actor_kind=guest. NOT an author_token: this is operational routing state, not attributable content, and it is already tenant-scoped. No FK -- the column is polymorphic by design.';
COMMENT ON COLUMN context_binding.source IS
    'qr | geo | manual | assignment. How the binding was established; qr always wins over the others because it is the only physically verified evidence of where the actor is.';
COMMENT ON COLUMN context_binding.qr_context_id IS
    'The context that produced this binding when source=qr. Kept alongside qr_code_id so a re-pointed sticker does not retroactively change what an existing binding meant.';
COMMENT ON COLUMN context_binding.context_snapshot IS
    'Denormalised copy of the resolved context envelope (names as well as ids) so the PWA context chip renders with no joins. Advisory cache only -- the immutable historical copies live on pulse_session and behaviour_signal.';
COMMENT ON COLUMN context_binding.bound_at IS
    '[SIGNAL] When this binding was (re)established. The per-actor sequence of bound_at values is the movement trace the Gather stage consumes; expired rows are therefore retained, not purged.';
COMMENT ON COLUMN context_binding.expires_at IS
    'Default now() + 8 hours = one shift. Treated as absent past this point; see the table comment for the full staleness rule.';
COMMENT ON COLUMN context_binding.deleted_at IS
    'Soft delete (e.g. GDPR erasure of a guest session). Never hard-deleted.';


-- =====================================================================
-- 7. ROW LEVEL SECURITY
--
-- Enabled AND FORCED on the five tenant-scoped tables. Not on task_type /
-- risk_type: global reference data, identical for every tenant.
--
-- Policy shape per Architecture Sec 3.3:
--   USING       -> app.bypass_rls escape for the worker / runAsSystem
--   WITH CHECK  -> NO bypass clause, ever.
-- =====================================================================

ALTER TABLE qr_context      ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_context      FORCE  ROW LEVEL SECURITY;
ALTER TABLE qr_code         ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_code         FORCE  ROW LEVEL SECURITY;
ALTER TABLE qr_scan_event   ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scan_event   FORCE  ROW LEVEL SECURITY;
ALTER TABLE pulse_template  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_template  FORCE  ROW LEVEL SECURITY;
ALTER TABLE context_binding ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_binding FORCE  ROW LEVEL SECURITY;

CREATE POLICY pol_tenant_isolation_qr_context ON qr_context
    USING (
         current_setting('app.bypass_rls', true) = 'on'
      OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
    WITH CHECK (
         tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    );

CREATE POLICY pol_tenant_isolation_qr_code ON qr_code
    USING (
         current_setting('app.bypass_rls', true) = 'on'
      OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
    WITH CHECK (
         tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    );

CREATE POLICY pol_tenant_isolation_qr_scan_event ON qr_scan_event
    USING (
         current_setting('app.bypass_rls', true) = 'on'
      OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
    WITH CHECK (
         tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    );

CREATE POLICY pol_tenant_isolation_context_binding ON context_binding
    USING (
         current_setting('app.bypass_rls', true) = 'on'
      OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
    WITH CHECK (
         tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    );

-- pulse_template differs in exactly one way: SafeIn5-global templates
-- (tenant_id IS NULL) are readable by every tenant. The WITH CHECK
-- deliberately omits the NULL case, so an application connection can
-- neither create a global template nor demote a tenant template into the
-- global namespace -- that is a migrator / runAsSystem operation only.
CREATE POLICY pol_tenant_isolation_pulse_template ON pulse_template
    USING (
         current_setting('app.bypass_rls', true) = 'on'
      OR tenant_id IS NULL
      OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
    WITH CHECK (
         tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    );

COMMENT ON POLICY pol_tenant_isolation_pulse_template ON pulse_template IS
    'Read: own tenant OR SafeIn5-global (tenant_id IS NULL) OR system bypass. Write: own tenant only -- otherwise any tenant admin could publish a template into every tenant on the platform.';

-- QR RESOLUTION IS UNAUTHENTICATED AND CROSS-TENANT BY NATURE (Sec 6.2
-- hard rule 1): a worker at a confined-space entry must reach the rescue
-- plan with zero friction, and the scanning device has no tenant context
-- until the token is resolved. GET /v1/qr/{token}/resolve therefore runs
-- inside runAsSystem (app.bypass_rls='on') for the resolve query ONLY,
-- and returns context + safety content only -- never signal/feed content,
-- which stays behind the authenticated, tenant-scoped path. No permanent
-- public-read policy is added here on purpose: it would be a standing
-- cross-tenant read grant on every connection, whereas runAsSystem is a
-- single audited call site.

-- =====================================================================
-- 8. DEFERRED FOREIGN KEYS -- 0004 must add exactly these two
--
--   ALTER TABLE qr_context ADD CONSTRAINT fk_qr_context_rescue_plan
--     FOREIGN KEY (rescue_plan_id, tenant_id)
--     REFERENCES rescue_plan (id, tenant_id);
--
--   ALTER TABLE qr_context ADD CONSTRAINT fk_qr_context_learn5_item
--     FOREIGN KEY (learn5_item_id) REFERENCES learn5_item (id);
--     -- single-column: learn5_item.tenant_id is nullable (global content)
--
-- NOT deferred, and deliberately never FK-enforced:
--   * qr_context.destinations[].ref -- polymorphic and nested in jsonb.
--   * pulse_template.steps[].learn5_item_id -- same reason, and optional.
--   Both have the replacement controls documented on their column
--   comments above.
-- =====================================================================

-- =====================================================================
-- End of migration 0003. Roles and grants: see 0007_rls_roles.sql.
-- =====================================================================
