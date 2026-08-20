-- =====================================================================
-- SafeIn5 MVP -- Migration 0001: FOUNDATION
-- Extensions, shared helpers, tenancy, site hierarchy, roles.
--
-- Source of truth: SafeIn5-MVP-Architecture.md
--   Sec 2.1 (Tenancy & Organisation), Sec 2.2 (role), Sec 3 (RLS),
--   Sec 4 (Anonymity), Sec 9 (build order -- M1 lands this slice first
--   precisely so that RLS is never retrofitted).
--
-- Conventions used throughout every SafeIn5 migration:
--   * PK is uuid default gen_random_uuid() unless stated.
--   * Every table has created_at timestamptz not null default now();
--     mutable tables also carry updated_at, maintained by set_updated_at().
--   * Every tenant-scoped table carries tenant_id uuid not null
--     references tenant(id), and has RLS ENABLED *and* FORCED.
--   * Enumerations are text + CHECK, never PG ENUM types, so a Phase-2
--     state is an ALTER ... CHECK (or a seed INSERT), never an ALTER TYPE.
--   * Soft delete only (deleted_at timestamptz). Nothing is ever hard
--     deleted: GDPR erasure works by tombstoning the user and destroying
--     the author_token mapping (Architecture Sec 4.4), not by DELETE.
--   * Every constraint is explicitly named (pk_/fk_/uq_/ck_/idx_).
--   * Plain ASCII only -- these files run through psql on Windows.
--
-- ROLES AND GRANTS ARE NOT IN THIS FILE. All role creation, table and
-- column privileges and the cross-cutting RLS policies that need every
-- table to exist live in 0007_rls_roles.sql. Migrations 0001..0006
-- create structure only; 0007 creates the security contract in one
-- reviewable place. This is deliberate: a grant scattered across six
-- files cannot be audited.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Extensions
--    Only pgcrypto and citext are permitted (deployment constraint:
--    these two are available on every managed Postgres 16 we target).
-- ---------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;     -- case-insensitive slug / email


-- ---------------------------------------------------------------------
-- 1. Shared helper: updated_at maintenance
--    Defined ONCE, here. Later migrations attach it with CREATE TRIGGER
--    and must never redefine the function -- two definitions that drift
--    is a class of bug that is invisible until an audit.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION set_updated_at() IS
'Shared BEFORE UPDATE trigger function: stamps updated_at = now() on any mutable table. Attach as: CREATE TRIGGER trg_<table>_updated_at BEFORE UPDATE ON <table> FOR EACH ROW EXECUTE FUNCTION set_updated_at(); Defined only in migration 0001.';


-- ---------------------------------------------------------------------
-- 2. tenant -- the RLS anchor. NOT itself tenant-scoped, NO RLS.
--    Architecture Sec 2.1.
--
--    The Community tenant is an ordinary row in this table, seeded with
--    a fixed UUID at migration time (Sec 2.1 note). Nothing downstream
--    special-cases it: RLS, feeds, moderation and the outbox all treat
--    it identically. That is what makes CQA-001 "one platform, two
--    operating models" true at the data layer.
-- ---------------------------------------------------------------------

CREATE TABLE tenant (
    id                      uuid         NOT NULL DEFAULT gen_random_uuid(),
    slug                    citext       NOT NULL,
    kind                    text         NOT NULL,
    name                    text         NOT NULL,
    industry_code           text,
    country_code            char(2),
    is_public_readable      boolean      NOT NULL DEFAULT false,
    allow_guest_submission  boolean      NOT NULL DEFAULT false,
    data_region             text         NOT NULL DEFAULT 'eu-west-1',
    theme                   jsonb        NOT NULL DEFAULT '{}'::jsonb,
    retention_policy        jsonb        NOT NULL DEFAULT
                                '{"signals_days": 730, "media_days": 365, "audit_days": 2555}'::jsonb,
    status                  text         NOT NULL DEFAULT 'active',
    created_at              timestamptz  NOT NULL DEFAULT now(),
    updated_at              timestamptz,
    deleted_at              timestamptz,

    CONSTRAINT pk_tenant                 PRIMARY KEY (id),
    CONSTRAINT uq_tenant_slug            UNIQUE (slug),
    CONSTRAINT ck_tenant_kind            CHECK (kind IN ('community', 'corporate')),
    CONSTRAINT ck_tenant_status          CHECK (status IN ('active', 'suspended')),
    CONSTRAINT ck_tenant_country_code    CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'),
    -- Slug is a URL path segment (/t/<slug>) and a login hint: keep it to
    -- lowercase-safe characters. citext makes the uniqueness check
    -- case-insensitive so 'Acme' and 'acme' cannot both exist.
    CONSTRAINT ck_tenant_slug_format     CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
    CONSTRAINT ck_tenant_theme_object    CHECK (jsonb_typeof(theme) = 'object'),
    CONSTRAINT ck_tenant_retention_object CHECK (jsonb_typeof(retention_policy) = 'object'),
    -- Only a community-kind tenant may expose an unauthenticated feed.
    -- SCP-024: corporate content must never leak to the community feed,
    -- so the misconfiguration is blocked in the schema, not in a service.
    CONSTRAINT ck_tenant_public_read_community_only
        CHECK (is_public_readable = false OR kind = 'community')
);

COMMENT ON TABLE  tenant IS
'The RLS anchor. Every tenant-scoped table references tenant(id) and every RLS policy keys on current_setting(''app.tenant_id''). One tenant IS one client organisation: the customer-facing organisation profile (name, industry_code, country_code) lives on this row, which is why the org_admin role administers a tenant. Deliberately NOT tenant-scoped and NOT RLS-protected: it is the root of the tenancy graph, and platform-admin paths read it via runAsSystem.';
COMMENT ON COLUMN tenant.slug IS
'URL/login-hint identifier, e.g. ''community'', ''brackley-aggregates''. citext so uniqueness is case-insensitive.';
COMMENT ON COLUMN tenant.kind IS
'community | corporate. Drives visibility defaults, moderation model and guest rules.';
COMMENT ON COLUMN tenant.industry_code IS
'[SIGNAL] Written at MVP, unread by any MVP feature. Sector code (e.g. SIC/NAICS-style) that lets the Phase-2 intelligence layer benchmark behaviour patterns across comparable industries. Unrecoverable retrospectively at scale, free to capture now.';
COMMENT ON COLUMN tenant.country_code IS 'ISO 3166-1 alpha-2, uppercase.';
COMMENT ON COLUMN tenant.is_public_readable IS
'true only for the Community tenant -- the single tenant whose final, visible signals are readable unauthenticated (Architecture Sec 3.3 community_public_read policy).';
COMMENT ON COLUMN tenant.allow_guest_submission IS
'Per-tenant switch resolving the open question in WRK-003. Community pilot ships false (PRD Sec 5.6 "guest reads, account writes") but is flippable without a deploy or a migration.';
COMMENT ON COLUMN tenant.data_region IS
'Storage/compute region for this tenant''s data. EU residency NFR; default eu-west-1.';
COMMENT ON COLUMN tenant.theme IS
'MVP theming scope is logo + colour only: {"logo_url": "...", "colour_tokens": {...}}.';
COMMENT ON COLUMN tenant.retention_policy IS
'{signals_days, media_days, audit_days}. Read by the nightly retention job (GDPR NFR); per-tenant because corporate contracts and the Community tenant will not agree on retention.';
COMMENT ON COLUMN tenant.deleted_at IS
'Soft delete. Never hard delete a tenant -- its signals are referenced by audit_log and outbox_event, which are append-only.';


-- ---------------------------------------------------------------------
-- 3. role -- GLOBAL reference table. NOT tenant-scoped, NO RLS.
--    Architecture Sec 2.2. Open-Questions #32 resolved to "fixed roles,
--    not a configurable permission matrix" -- a permission engine is out
--    of proportion to a 60-user pilot (QA-006 defers advanced permissions
--    to Phase 2). Supervisor and org_admin stay distinct from day one
--    because they differ on cross-site visibility, which is a data-access
--    boundary and therefore an RLS/guard concern, not a UI difference.
-- ---------------------------------------------------------------------

CREATE TABLE role (
    id           uuid         NOT NULL DEFAULT gen_random_uuid(),
    code         text         NOT NULL,
    name         text         NOT NULL,
    description  text,
    permissions  jsonb        NOT NULL DEFAULT '[]'::jsonb,
    sort_order   integer      NOT NULL DEFAULT 0,
    is_active    boolean      NOT NULL DEFAULT true,
    created_at   timestamptz  NOT NULL DEFAULT now(),
    updated_at   timestamptz,

    CONSTRAINT pk_role                PRIMARY KEY (id),
    CONSTRAINT uq_role_code           UNIQUE (code),
    CONSTRAINT ck_role_code           CHECK (code IN
        ('worker', 'supervisor', 'org_admin', 'platform_admin', 'moderator')),
    -- Flat string array only. A nested permission document would be the
    -- start of an RBAC engine; the Permissions guard does a set-membership
    -- check and nothing more.
    CONSTRAINT ck_role_permissions_array CHECK (jsonb_typeof(permissions) = 'array')
);

COMMENT ON TABLE  role IS
'Global reference table of the five MVP roles. Not tenant-scoped: the same role definitions apply in every tenant, and a user holds a role per membership (user_tenant_membership.role_id, migration 0002). Seeded here with fixed UUIDs so later migrations and fixtures can reference them deterministically.';
COMMENT ON COLUMN role.code IS
'Stable machine identifier used in JWT claims (rol) and in guards. CHECK-constrained rather than a PG ENUM so a Phase-2 role is an ALTER ... CHECK plus one INSERT.';
COMMENT ON COLUMN role.permissions IS
'Flat JSON array of permission strings, e.g. ["signal.create","feed.read"]. No RBAC engine at MVP: the Permissions guard performs a set-membership test against this array.';


-- ---------------------------------------------------------------------
-- 4. site -- tenant-scoped.
-- ---------------------------------------------------------------------

CREATE TABLE site (
    id               uuid          NOT NULL DEFAULT gen_random_uuid(),
    tenant_id        uuid          NOT NULL,
    name             text          NOT NULL,
    city             text,
    country_code     char(2),
    timezone         text          NOT NULL DEFAULT 'Europe/London',
    centroid_lat     numeric(9,6),
    centroid_lon     numeric(9,6),
    status           text          NOT NULL DEFAULT 'active',
    created_at       timestamptz   NOT NULL DEFAULT now(),
    updated_at       timestamptz,
    deleted_at       timestamptz,

    CONSTRAINT pk_site                PRIMARY KEY (id),
    CONSTRAINT fk_site_tenant         FOREIGN KEY (tenant_id) REFERENCES tenant (id),
    CONSTRAINT ck_site_status         CHECK (status IN ('active', 'inactive')),
    CONSTRAINT ck_site_country_code   CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'),
    CONSTRAINT ck_site_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT ck_site_centroid_lat   CHECK (centroid_lat IS NULL OR centroid_lat BETWEEN -90  AND 90),
    CONSTRAINT ck_site_centroid_lon   CHECK (centroid_lon IS NULL OR centroid_lon BETWEEN -180 AND 180),
    -- A half-populated centroid is a silent geo bug; require both or neither.
    CONSTRAINT ck_site_centroid_pair
        CHECK ((centroid_lat IS NULL) = (centroid_lon IS NULL))
);

-- Composite uniqueness on (id, tenant_id) is not redundant: it is the
-- target of the composite FKs used throughout the schema, which make it
-- structurally impossible for a child row to reference a parent in
-- another tenant. Cross-tenant referential drift is the one class of bug
-- RLS cannot catch, because both rows are individually valid.
ALTER TABLE site
    ADD CONSTRAINT uq_site_id_tenant UNIQUE (id, tenant_id);

-- Architecture Sec 2.1 mandates site names be unique within the owning
-- organisation; one tenant IS one organisation, so the key is tenant_id.
-- Implemented as a partial unique index so that a soft-deleted site does
-- not permanently reserve its name -- soft delete must not behave like a
-- tombstone that blocks re-creation. It also serves as the tenant_id
-- lookup index, so no separate idx_site_tenant is needed.
CREATE UNIQUE INDEX uq_site_tenant_lower_name
    ON site (tenant_id, lower(name))
    WHERE deleted_at IS NULL;

COMMENT ON TABLE  site IS
'A physical site (e.g. a quarry) belonging to a tenant (= one client organisation). Top of the context hierarchy used by QR resolution, feed scoping and user_site_assignment.';
COMMENT ON COLUMN site.timezone IS
'[SIGNAL] IANA timezone name. Shift and time-of-day pattern analysis requires local time, and this is uncorrectable retrospectively once signals have been captured against a wrong or absent zone.';
COMMENT ON COLUMN site.centroid_lat IS
'[SIGNAL] Site centroid latitude, numeric(9,6) (~0.1 m precision). Feeds geo clustering and proximity context resolution (ADM-006).';
COMMENT ON COLUMN site.centroid_lon IS
'[SIGNAL] Site centroid longitude. See centroid_lat.';
COMMENT ON COLUMN site.deleted_at IS 'Soft delete. Sub-sites, assets, QR contexts and signals reference this row.';


-- ---------------------------------------------------------------------
-- 5. sub_site -- tenant-scoped. Area / zone / task zone / asset group.
--    Self-referencing parent, nullable, DEPTH CAPPED AT 1 for MVP.
-- ---------------------------------------------------------------------

CREATE TABLE sub_site (
    id                  uuid          NOT NULL DEFAULT gen_random_uuid(),
    tenant_id           uuid          NOT NULL,
    site_id             uuid          NOT NULL,
    parent_sub_site_id  uuid,
    name                text          NOT NULL,
    kind                text          NOT NULL DEFAULT 'area',
    centroid_lat        numeric(9,6),
    centroid_lon        numeric(9,6),
    status              text          NOT NULL DEFAULT 'active',
    created_at          timestamptz   NOT NULL DEFAULT now(),
    updated_at          timestamptz,
    deleted_at          timestamptz,

    CONSTRAINT pk_sub_site              PRIMARY KEY (id),
    CONSTRAINT fk_sub_site_tenant       FOREIGN KEY (tenant_id) REFERENCES tenant (id),
    CONSTRAINT fk_sub_site_site         FOREIGN KEY (site_id, tenant_id)
        REFERENCES site (id, tenant_id),
    -- fk_sub_site_parent is added below, after uq_sub_site_id_tenant
    -- exists: a self-referencing composite FK cannot be declared inline
    -- because its target unique constraint is not yet in place.
    CONSTRAINT ck_sub_site_kind         CHECK (kind IN ('area', 'zone', 'task_zone', 'asset_group')),
    CONSTRAINT ck_sub_site_status       CHECK (status IN ('active', 'inactive')),
    CONSTRAINT ck_sub_site_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT ck_sub_site_not_self_parent CHECK (parent_sub_site_id IS DISTINCT FROM id),
    CONSTRAINT ck_sub_site_centroid_lat CHECK (centroid_lat IS NULL OR centroid_lat BETWEEN -90  AND 90),
    CONSTRAINT ck_sub_site_centroid_lon CHECK (centroid_lon IS NULL OR centroid_lon BETWEEN -180 AND 180),
    CONSTRAINT ck_sub_site_centroid_pair
        CHECK ((centroid_lat IS NULL) = (centroid_lon IS NULL))
);

ALTER TABLE sub_site
    ADD CONSTRAINT uq_sub_site_id_tenant UNIQUE (id, tenant_id);

-- Self-FK: a parent sub_site must live in the same tenant. Same-site
-- agreement and the depth cap are enforced by trg_sub_site_depth_cap.
ALTER TABLE sub_site
    ADD CONSTRAINT fk_sub_site_parent FOREIGN KEY (parent_sub_site_id, tenant_id)
        REFERENCES sub_site (id, tenant_id);

CREATE UNIQUE INDEX uq_sub_site_site_lower_name
    ON sub_site (site_id, lower(name))
    WHERE deleted_at IS NULL;

CREATE INDEX idx_sub_site_tenant_site
    ON sub_site (tenant_id, site_id)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_sub_site_parent
    ON sub_site (parent_sub_site_id)
    WHERE parent_sub_site_id IS NOT NULL AND deleted_at IS NULL;

COMMENT ON TABLE  sub_site IS
'A named area/zone within a site -- the level at which QR codes, feeds and Learn5 bindings are usually scoped. Self-nesting is permitted structurally but capped at one level of nesting in MVP by trg_sub_site_depth_cap.';
COMMENT ON COLUMN sub_site.kind IS
'area | zone | task_zone | asset_group. Structured rather than free text because these are grouping keys the future SIGNAL layer depends on (Open-Questions: hierarchy model).';
COMMENT ON COLUMN sub_site.parent_sub_site_id IS
'Optional parent sub-site, same site and same tenant. Nullable self-FK: SafeIn5 explicitly warned against complex hierarchy (WRK-013 amendment), so MVP caps depth at 1 -- but the column costs nothing now and avoids a migration if Phase 2 needs depth.';
COMMENT ON COLUMN sub_site.centroid_lat IS '[SIGNAL] Zone centroid latitude; geo-based context resolution and clustering.';
COMMENT ON COLUMN sub_site.centroid_lon IS '[SIGNAL] Zone centroid longitude.';


-- MVP depth cap, implemented as a trigger because a CHECK constraint
-- cannot query another row (Architecture Sec 2.1: "depth capped at 1 in
-- MVP (CHECK via trigger)").
--
-- PHASE 2: to enable deeper nesting, DROP TRIGGER trg_sub_site_depth_cap
-- ON sub_site. Nothing else in the schema constrains depth.
CREATE OR REPLACE FUNCTION sub_site_enforce_depth_cap()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_grandparent_id uuid;
    v_parent_site_id uuid;
BEGIN
    IF NEW.parent_sub_site_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT p.parent_sub_site_id, p.site_id
      INTO v_grandparent_id, v_parent_site_id
      FROM sub_site p
     WHERE p.id = NEW.parent_sub_site_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'sub_site % references a parent_sub_site_id % that does not exist',
            NEW.id, NEW.parent_sub_site_id
            USING ERRCODE = '23503';
    END IF;

    IF v_parent_site_id <> NEW.site_id THEN
        RAISE EXCEPTION
            'sub_site % must share site_id with its parent (parent site %, child site %)',
            NEW.id, v_parent_site_id, NEW.site_id
            USING ERRCODE = '23514';
    END IF;

    IF v_grandparent_id IS NOT NULL THEN
        RAISE EXCEPTION
            'sub_site nesting is capped at one level in MVP: parent % already has a parent %',
            NEW.parent_sub_site_id, v_grandparent_id
            USING ERRCODE = '23514',
                  HINT = 'Attach this sub_site directly to the top-level sub_site, or drop trigger trg_sub_site_depth_cap to enable deeper nesting in Phase 2.';
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION sub_site_enforce_depth_cap() IS
'MVP guard: a sub_site may have a parent, but that parent may not itself have a parent (max nesting depth 1). Also enforces that parent and child share a site. Dropping trg_sub_site_depth_cap is the entire Phase-2 change needed to allow deeper hierarchies.';

CREATE TRIGGER trg_sub_site_depth_cap
    BEFORE INSERT OR UPDATE OF parent_sub_site_id, site_id ON sub_site
    FOR EACH ROW
    EXECUTE FUNCTION sub_site_enforce_depth_cap();


-- ---------------------------------------------------------------------
-- 6. asset -- tenant-scoped.
--    Architecture Sec 2.1 justification: the anchor scenario is
--    "Asset ID = spreader beam", and the supervisor insight the product
--    is sold on -- "3 similar Be Aware signals in 2 weeks, all on custom
--    lifting fixtures" -- is literally a GROUP BY asset_id. Collapsing
--    asset into a free-text field on sub_site turns that query into
--    string matching and makes the flagship demo unreliable.
-- ---------------------------------------------------------------------

CREATE TABLE asset (
    id            uuid          NOT NULL DEFAULT gen_random_uuid(),
    tenant_id     uuid          NOT NULL,
    site_id       uuid          NOT NULL,
    sub_site_id   uuid,
    external_ref  text,
    name          text          NOT NULL,
    asset_type    text          NOT NULL DEFAULT 'other',
    status        text          NOT NULL DEFAULT 'active',
    created_at    timestamptz   NOT NULL DEFAULT now(),
    updated_at    timestamptz,
    deleted_at    timestamptz,

    CONSTRAINT pk_asset               PRIMARY KEY (id),
    CONSTRAINT fk_asset_tenant        FOREIGN KEY (tenant_id) REFERENCES tenant (id),
    CONSTRAINT fk_asset_site          FOREIGN KEY (site_id, tenant_id)
        REFERENCES site (id, tenant_id),
    CONSTRAINT fk_asset_sub_site      FOREIGN KEY (sub_site_id, tenant_id)
        REFERENCES sub_site (id, tenant_id),
    CONSTRAINT ck_asset_type          CHECK (asset_type IN
        ('fixed_plant', 'mobile_plant', 'fixture', 'access_structure', 'other')),
    CONSTRAINT ck_asset_status        CHECK (status IN ('active', 'inactive', 'decommissioned')),
    CONSTRAINT ck_asset_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT ck_asset_external_ref_not_blank
        CHECK (external_ref IS NULL OR btrim(external_ref) <> '')
);

ALTER TABLE asset
    ADD CONSTRAINT uq_asset_id_tenant UNIQUE (id, tenant_id);

-- The client's own tag ID must be unique within a tenant when supplied,
-- otherwise "all signals on SB-14" silently splits across two rows.
CREATE UNIQUE INDEX uq_asset_tenant_lower_external_ref
    ON asset (tenant_id, lower(external_ref))
    WHERE external_ref IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_asset_tenant_site
    ON asset (tenant_id, site_id)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_asset_tenant_sub_site
    ON asset (tenant_id, sub_site_id)
    WHERE sub_site_id IS NOT NULL AND deleted_at IS NULL;

-- Supports the flagship supervisor insight query, which groups signals by
-- asset and then joins back for the label/type.
CREATE INDEX idx_asset_tenant_type
    ON asset (tenant_id, asset_type)
    WHERE deleted_at IS NULL;

COMMENT ON TABLE  asset IS
'A physical asset: fixed or mobile plant, a lifting fixture, an access structure. Deliberately a real table, not a free-text field: the flagship supervisor insight -- "3 similar Be Aware signals in 2 weeks, all on custom lifting fixtures" -- is a GROUP BY asset_id over behaviour_signal, and string matching would make that demo unreliable. Admin UX keeps assets optional.';
COMMENT ON COLUMN asset.site_id IS
'Required. Every asset belongs to a site even when it is not pinned to a sub-site, so site-scoped feeds and RLS-adjacent scoping never need a NULL branch.';
COMMENT ON COLUMN asset.sub_site_id IS
'Optional. An asset may hang directly off a site (mobile plant that moves between zones) or off a specific sub-site. Must belong to the same tenant; agreement between asset.site_id and sub_site.site_id is enforced by trg_asset_sub_site_site_match.';
COMMENT ON COLUMN asset.external_ref IS
'The client''s own asset/tag ID (e.g. "SB-14"). Free text because every quarry numbers its plant differently; unique per tenant when present so grouped insight queries do not split.';
COMMENT ON COLUMN asset.asset_type IS
'fixed_plant | mobile_plant | fixture | access_structure | other. Structured so "custom lifting fixtures" is a filter, not a text search.';

-- Consistency guard: if an asset names a sub_site, that sub_site must be
-- in the same site. Cannot be a CHECK (cross-row lookup).
CREATE OR REPLACE FUNCTION asset_enforce_sub_site_site_match()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_sub_site_site_id uuid;
BEGIN
    IF NEW.sub_site_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT s.site_id INTO v_sub_site_site_id
      FROM sub_site s
     WHERE s.id = NEW.sub_site_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'asset % references a sub_site % that does not exist',
            NEW.id, NEW.sub_site_id
            USING ERRCODE = '23503';
    END IF;

    IF v_sub_site_site_id <> NEW.site_id THEN
        RAISE EXCEPTION
            'asset % site_id % does not match sub_site % site_id %',
            NEW.id, NEW.site_id, NEW.sub_site_id, v_sub_site_site_id
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION asset_enforce_sub_site_site_match() IS
'Guarantees asset.site_id agrees with sub_site.site_id when an asset is pinned to a sub-site, so site-scoped and zone-scoped feeds can never disagree about where an asset lives.';

CREATE TRIGGER trg_asset_sub_site_site_match
    BEFORE INSERT OR UPDATE OF site_id, sub_site_id ON asset
    FOR EACH ROW
    EXECUTE FUNCTION asset_enforce_sub_site_site_match();


-- ---------------------------------------------------------------------
-- 7. updated_at triggers
-- ---------------------------------------------------------------------

CREATE TRIGGER trg_tenant_updated_at
    BEFORE UPDATE ON tenant
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- 7a. tenant row-scope guard
--
--     tenant cannot be RLS-protected: it is the anchor the policies key
--     off, so a tenant_id policy on it would be circular. But because
--     one tenant IS one client organisation, the editable organisation
--     profile (name, industry_code, country_code, theme) lives on this
--     row -- so a runtime UPDATE must still be confined to the caller's
--     own tenant.
--
--     0007 restricts WHICH columns safein5_app may write. This trigger
--     restricts WHICH ROW. Both are needed: column grants do not scope
--     rows, and without this an app-role UPDATE could rewrite any
--     tenant on the platform.
--
--     The app.bypass_rls escape mirrors the RLS policies, so the
--     background worker and the audited runAsSystem path still work.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION tenant_enforce_self_scope()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF current_setting('app.bypass_rls', true) = 'on' THEN
        RETURN NEW;
    END IF;

    IF NEW.id IS DISTINCT FROM
       nullif(current_setting('app.tenant_id', true), '')::uuid THEN
        RAISE EXCEPTION
            'tenant % may only be updated within its own scope (app.tenant_id = %)',
            NEW.id, coalesce(current_setting('app.tenant_id', true), '<unset>')
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION tenant_enforce_self_scope() IS
    'tenant carries the merged organisation profile but cannot be RLS-protected (it is the RLS anchor). This trigger is the substitute row guard: a runtime UPDATE must target the caller''s own tenant, or run through the audited app.bypass_rls path. Paired with the column-level UPDATE grant in 0007 section 4.';

CREATE TRIGGER trg_tenant_self_scope
    BEFORE UPDATE ON tenant
    FOR EACH ROW EXECUTE FUNCTION tenant_enforce_self_scope();

CREATE TRIGGER trg_role_updated_at
    BEFORE UPDATE ON role
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_site_updated_at
    BEFORE UPDATE ON site
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_sub_site_updated_at
    BEFORE UPDATE ON sub_site
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_asset_updated_at
    BEFORE UPDATE ON asset
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------------------------------------------------------------------
-- 8. Seed data
--
--     Seeded BEFORE row-level security is enabled in section 9. FORCE
--     ROW LEVEL SECURITY applies to the table owner too, so seeding after
--     the ALTER would require an app.tenant_id GUC -- and SET LOCAL is a
--     no-op outside an explicit transaction, which makes the migration's
--     correctness depend on how the runner invokes psql. Ordering the
--     statements instead removes that dependency entirely.
--
--     COMMUNITY TENANT UUID (fixed, referenced by application config as
--     COMMUNITY_TENANT_ID and by the community_public_read policy):
--
--         tenant       00000000-0000-0000-0000-0000000000c0
-- ---------------------------------------------------------------------

INSERT INTO role (id, code, name, description, permissions, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000001',
     'worker',
     'Worker',
     'Frontline worker. Captures behaviour signals, completes PULSE, views Learn5 and the feed for their assigned scope.',
     '["signal.create","signal.read.own","signal.read.scoped","pulse.run","learn5.read","learn5.view.record","qr.resolve","feed.read","feed.read_state.write","rescue_plan.read","me.read","me.update"]'::jsonb,
     10),

    ('00000000-0000-0000-0000-000000000002',
     'supervisor',
     'Supervisor / Site Lead',
     'Acknowledges and closes review tasks within assigned sites. MVP workflow is Acknowledge + Close only (PRD Sec 5.4).',
     '["signal.create","signal.read.own","signal.read.scoped","pulse.run","learn5.read","learn5.view.record","qr.resolve","feed.read","feed.read_state.write","rescue_plan.read","me.read","me.update","review_task.read","workflow.acknowledge","workflow.close","evidence.create","analytics.read.site"]'::jsonb,
     20),

    ('00000000-0000-0000-0000-000000000003',
     'org_admin',
     'Organisation Admin',
     'Administers one organisation: sites, sub-sites, assets, users, QR codes, Learn5, rescue plans, analytics. Cross-site visibility within the tenant.',
     '["signal.read.scoped","feed.read","learn5.read","rescue_plan.read","qr.resolve","me.read","me.update","review_task.read","workflow.acknowledge","workflow.close","org.manage","site.manage","sub_site.manage","asset.manage","user.manage","user.invite","user.block","site_assignment.manage","qr_code.manage","qr_context.manage","learn5.manage","rescue_plan.manage","pulse_template.manage","moderation.act","analytics.read.tenant","analytics.export","audit.read"]'::jsonb,
     30),

    ('00000000-0000-0000-0000-000000000004',
     'platform_admin',
     'SafeIn5 Platform Admin',
     'SafeIn5 internal. Full access across all tenants via runAsSystem; every action is audited. Administers the Community tenant.',
     '["tenant.manage","org.manage","site.manage","sub_site.manage","asset.manage","user.manage","user.invite","user.block","user.erase","site_assignment.manage","qr_code.manage","qr_context.manage","learn5.manage","rescue_plan.manage","pulse_template.manage","moderation.act","signal.read.scoped","review_task.read","workflow.acknowledge","workflow.close","workflow.reopen","analytics.read.platform","analytics.export","audit.read","system.bypass_rls"]'::jsonb,
     40),

    ('00000000-0000-0000-0000-000000000005',
     'moderator',
     'Community Moderator',
     'Moderates the Community tenant feed: hide, unhide, remove, edit classification, block author (by author_token only -- never learns an identity).',
     '["signal.read.scoped","feed.read","moderation.act","moderation.queue.read","moderation.block_author","audit.read"]'::jsonb,
     50);


-- The Community tenant. An ordinary row: nothing in the schema and
-- nothing in the application branches on it.
INSERT INTO tenant (
    id, slug, kind, name, country_code,
    is_public_readable, allow_guest_submission,
    data_region, theme, retention_policy, status
) VALUES (
    '00000000-0000-0000-0000-0000000000c0',
    'community',
    'community',
    'SafeIn5 Community',
    'GB',
    true,
    false,
    'eu-west-1',
    '{"logo_url": null, "colour_tokens": {}}'::jsonb,
    '{"signals_days": 730, "media_days": 365, "audit_days": 2555}'::jsonb,
    'active'
);


-- ---------------------------------------------------------------------
-- 9. Row-Level Security
--    Architecture Sec 3.3. Applied to site, sub_site and asset. NOT
--    applied to tenant or role: tenant is the anchor itself
--    and role is global reference data.
--
--    Policy shape, identical on every tenant-scoped table in every file:
--      USING       -> bypass GUC OR tenant match     (reads)
--      WITH CHECK  -> tenant match ONLY, no bypass   (writes)
--    The write path deliberately has no escape hatch: not even the
--    background worker may insert a row into the wrong tenant.
--
--    FORCE is set because the table owner (safein5_migrator) would
--    otherwise bypass RLS implicitly, and an accidental owner connection
--    at runtime would silently disable isolation.
--
--    current_setting(..., true) returns NULL when unset, so an unscoped
--    connection sees zero rows rather than erroring -- fail closed.
-- ---------------------------------------------------------------------

ALTER TABLE site ENABLE ROW LEVEL SECURITY;
ALTER TABLE site FORCE  ROW LEVEL SECURITY;

CREATE POLICY pol_tenant_isolation_site ON site
    USING (
            current_setting('app.bypass_rls', true) = 'on'
         OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
    WITH CHECK (
            tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    );

ALTER TABLE sub_site ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_site FORCE  ROW LEVEL SECURITY;

CREATE POLICY pol_tenant_isolation_sub_site ON sub_site
    USING (
            current_setting('app.bypass_rls', true) = 'on'
         OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
    WITH CHECK (
            tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    );

ALTER TABLE asset ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset FORCE  ROW LEVEL SECURITY;

CREATE POLICY pol_tenant_isolation_asset ON asset
    USING (
            current_setting('app.bypass_rls', true) = 'on'
         OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
    WITH CHECK (
            tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    );

-- =====================================================================
-- End of migration 0001. Roles and grants: see 0007_rls_roles.sql.
-- =====================================================================
