-- =====================================================================
-- Phase 1 — sign in as platform admin (single file, empty database)
--
-- Run in pgAdmin Query Tool or:
--   psql -U postgres -d safein5 -v ON_ERROR_STOP=1 -f db/phases/01-platform-admin.sql
--
-- Change v_admin_email in the seed block at the bottom if you need a
-- different inbox for OTP.
--
-- After this script:
--   POST /api/v1/auth/otp/request  { "email": "<that email>" }
--   POST /api/v1/auth/otp/verify   { "email": "<that email>", "code": "..." }
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------

CREATE TABLE app_user (
    id                 integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email              text        NOT NULL UNIQUE,
    first_name         text,
    last_name          text,
    phone              text,
    email_verified_at  timestamptz,
    account_status     text        NOT NULL DEFAULT 'invited'
                       CHECK (account_status IN ('invited', 'active', 'suspended')),
    is_platform_admin  boolean     NOT NULL DEFAULT false,
    last_signed_in_at  timestamptz,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    created_by         integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by         integer     REFERENCES app_user (id) ON DELETE SET NULL
);

CREATE TABLE auth_token (
    id             integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id        integer     NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    kind           text        NOT NULL CHECK (kind IN ('otp')),
    token_hash     text        NOT NULL,
    expires_at     timestamptz NOT NULL,
    consumed_at    timestamptz,
    attempt_count  integer     NOT NULL DEFAULT 0,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    created_by     integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by     integer     REFERENCES app_user (id) ON DELETE SET NULL
);
CREATE INDEX idx_auth_token_user_id    ON auth_token (user_id);
CREATE INDEX idx_auth_token_token_hash ON auth_token (token_hash);

-- ---------------------------------------------------------------------
-- Tenancy
-- ---------------------------------------------------------------------

CREATE TABLE tenant (
    id          integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        text        NOT NULL,
    kind        text        NOT NULL DEFAULT 'community'
                CHECK (kind IN ('community', 'corporate')),
    domain      text,
    status      text        NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'inactive')),
    echo_retention   text   NOT NULL DEFAULT '7_years'
                     CHECK (echo_retention IN ('3_years', '7_years', '10_years', 'indefinite')),
    media_retention  text   NOT NULL DEFAULT '2_years'
                     CHECK (media_retention IN ('1_year', '2_years', '5_years', 'match_echo')),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    created_by  integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by  integer     REFERENCES app_user (id) ON DELETE SET NULL
);

INSERT INTO tenant (name, kind)
VALUES ('SafeIn5 Community', 'community');

CREATE TABLE user_tenant_membership (
    id          integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     integer     NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    tenant_id   integer     NOT NULL REFERENCES tenant (id),
    role        text        NOT NULL DEFAULT 'member'
                CHECK (role IN ('member', 'tenant_admin')),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    created_by  integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by  integer     REFERENCES app_user (id) ON DELETE SET NULL,
    UNIQUE (user_id, tenant_id)
);
CREATE INDEX idx_membership_user   ON user_tenant_membership (user_id);
CREATE INDEX idx_membership_tenant ON user_tenant_membership (tenant_id);

CREATE TABLE site (
    id              integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id       integer     NOT NULL REFERENCES tenant (id),
    name            text        NOT NULL,
    location        text,
    approval_status text        NOT NULL DEFAULT 'approved'
                    CHECK (approval_status IN ('pending', 'approved')),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    created_by      integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by      integer     REFERENCES app_user (id) ON DELETE SET NULL
);
CREATE INDEX idx_site_tenant ON site (tenant_id, name);

CREATE TABLE role (
    id          integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    scope       text        NOT NULL
                CHECK (scope IN ('platform', 'tenant', 'site')),
    key         text        NOT NULL,
    name        text        NOT NULL,
    description text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    created_by  integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by  integer     REFERENCES app_user (id) ON DELETE SET NULL,
    UNIQUE (scope, key),
    CHECK (
        (scope = 'platform' AND key = 'platform_admin')
        OR (scope = 'tenant' AND key IN ('member', 'tenant_admin'))
        OR (scope = 'site' AND key IN ('worker', 'supervisor', 'site_manager'))
    )
);
CREATE INDEX idx_role_scope_key ON role (scope, key);

INSERT INTO role (scope, key, name, description) VALUES
    ('platform', 'platform_admin', 'Platform administrator', 'SafeIn5 admin — all tenants'),
    ('tenant',   'member',         'Organisation member',    'Invited; no site job yet'),
    ('tenant',   'tenant_admin',   'Client administrator',   'Org-wide back office'),
    ('site',     'worker',         'Worker',                 'PWA / field worker at a site'),
    ('site',     'supervisor',     'Supervisor',             'Supervisor at a site'),
    ('site',     'site_manager',   'Site manager',           'Site-scoped admin');

CREATE TABLE user_site_membership (
    id          integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     integer     NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    site_id     integer     NOT NULL REFERENCES site (id) ON DELETE CASCADE,
    role_id     integer     NOT NULL REFERENCES role (id),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    created_by  integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by  integer     REFERENCES app_user (id) ON DELETE SET NULL,
    UNIQUE (user_id, site_id)
);
CREATE INDEX idx_user_site_user ON user_site_membership (user_id);
CREATE INDEX idx_user_site_site ON user_site_membership (site_id);
CREATE INDEX idx_user_site_role ON user_site_membership (role_id);

CREATE OR REPLACE FUNCTION assert_site_membership_role()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM role r
        WHERE r.id = NEW.role_id AND r.scope = 'site'
    ) THEN
        RAISE EXCEPTION 'user_site_membership.role_id must reference a site-scoped role';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_user_site_membership_role_scope
    BEFORE INSERT OR UPDATE OF role_id ON user_site_membership
    FOR EACH ROW EXECUTE FUNCTION assert_site_membership_role();

CREATE TABLE space (
    id                   integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id            integer     NOT NULL REFERENCES tenant (id),
    site_id              integer     NOT NULL REFERENCES site (id),
    name                 text        NOT NULL,
    location             text,
    asset_type           text,
    task_type            text,
    qr_code              text        UNIQUE,
    permit_required      boolean     NOT NULL DEFAULT false,
    rescue_plan_required boolean     NOT NULL DEFAULT false,
    content_owner_user_id integer    REFERENCES app_user (id) ON DELETE SET NULL,
    owner_rule           text,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now(),
    created_by           integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by           integer     REFERENCES app_user (id) ON DELETE SET NULL
);
CREATE INDEX idx_space_site   ON space (site_id, name);
CREATE INDEX idx_space_tenant ON space (tenant_id);

CREATE TABLE tenant_privacy_request (
    id              integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id       integer     NOT NULL REFERENCES tenant (id) ON DELETE CASCADE,
    requested_by    integer     REFERENCES app_user (id) ON DELETE SET NULL,
    status          text        NOT NULL DEFAULT 'logged'
                    CHECK (status IN ('logged', 'approved', 'completed', 'cancelled')),
    note            text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    created_by      integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by      integer     REFERENCES app_user (id) ON DELETE SET NULL
);
CREATE INDEX idx_privacy_request_tenant ON tenant_privacy_request (tenant_id, created_at DESC);

-- ---------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------

CREATE TABLE permission (
    id           integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    resource     text        NOT NULL,
    action       text        NOT NULL,
    description  text        NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    created_by   integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by   integer     REFERENCES app_user (id) ON DELETE SET NULL,
    UNIQUE (resource, action)
);
CREATE INDEX idx_permission_resource ON permission (resource, action);

CREATE TABLE role_permission (
    id             integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_id        integer     NOT NULL REFERENCES role (id) ON DELETE CASCADE,
    permission_id  integer     NOT NULL REFERENCES permission (id) ON DELETE CASCADE,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    created_by     integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by     integer     REFERENCES app_user (id) ON DELETE SET NULL,
    UNIQUE (role_id, permission_id)
);
CREATE INDEX idx_role_permission_role ON role_permission (role_id);

INSERT INTO permission (resource, action, description) VALUES
    ('nav',        'clients',        'Clients list and client onboarding'),
    ('nav',        'users',          'People / users'),
    ('nav',        'setup',          'Set up wizard (legacy; screens remain)'),
    ('nav',        'sites',          'Sites'),
    ('nav',        'spaces',         'Spaces / QR'),
    ('nav',        'jobs',           'Tasks'),
    ('nav',        'queue',          'Echo queue'),
    ('nav',        'analytics',      'Analytics dashboards'),
    ('nav',        'content',        'Content library'),
    ('nav',        'docs',           'Documents library'),
    ('clients',    'view',           'View all clients'),
    ('clients',    'create',         'Add a client'),
    ('clients',    'invite_admin',   'Invite a client administrator'),
    ('clients',    'privacy',        'Raise a privacy request'),
    ('people',     'view',           'View people'),
    ('people',     'invite',         'Invite people'),
    ('people',     'bulk_import',    'Bulk import people'),
    ('people',     'suspend',        'Suspend access'),
    ('sites',      'view',           'View sites'),
    ('sites',      'create',         'Add a site'),
    ('sites',      'bulk_import',    'Bulk import sites'),
    ('sites',      'approve',        'Approve a pending site'),
    ('spaces',     'view',           'View spaces'),
    ('spaces',     'create',         'Add a space'),
    ('spaces',     'qr_print',       'Print QR labels'),
    ('tasks',      'view',           'View tasks'),
    ('tasks',      'create',         'Add a task'),
    ('tasks',      'duplicate',      'Duplicate a task'),
    ('tasks',      'template',       'Create / edit task templates'),
    ('tasks',      'assign',         'Confirm and assign a task'),
    ('documents',  'view',           'View documents'),
    ('documents',  'upload',         'Upload a document'),
    ('documents',  'bulk_import',    'Bulk import documents'),
    ('documents',  'approve',        'Approve a document'),
    ('documents',  'make_live',      'Make an archived import live'),
    ('documents',  'attach',         'Attach a document to a space or task'),
    ('content',    'view',           'View content packs'),
    ('content',    'upload',         'Upload content'),
    ('content',    'publish',        'Publish a content revision'),
    ('content',    'attach',         'Attach content to a task'),
    ('content',    'contact_admin',  'Contact SafeIn5 admin (supervisor path)'),
    ('echoes',     'view',           'View the Echo queue'),
    ('echoes',     'confirm',        'Confirm an Echo'),
    ('echoes',     'assign',         'Confirm and assign an Echo'),
    ('echoes',     'close',          'Close an Echo'),
    ('analytics',  'view',           'View analytics'),
    ('pulse',      'start',          'Start a PULSE (worker app)'),
    ('echoes',     'create',         'Raise an Echo from PULSE');

CREATE OR REPLACE FUNCTION grant_role_permissions(
    p_scope text,
    p_key   text,
    p_grants text[]
) RETURNS void LANGUAGE sql AS $$
    INSERT INTO role_permission (role_id, permission_id)
    SELECT r.id, p.id
    FROM permission p
    CROSS JOIN role r
    WHERE r.scope = p_scope
      AND r.key = p_key
      AND (p.resource || '.' || p.action) = ANY (p_grants)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
$$;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
CROSS JOIN permission p
WHERE r.scope = 'platform' AND r.key = 'platform_admin';

SELECT grant_role_permissions('tenant', 'tenant_admin', ARRAY[
    'nav.users', 'nav.setup', 'nav.sites', 'nav.spaces', 'nav.jobs', 'nav.queue',
    'nav.analytics', 'nav.content', 'nav.docs',
    'people.view', 'people.invite', 'people.bulk_import', 'people.suspend',
    'sites.view', 'sites.create', 'sites.bulk_import', 'sites.approve',
    'spaces.view', 'spaces.create', 'spaces.qr_print',
    'tasks.view', 'tasks.create', 'tasks.duplicate', 'tasks.template', 'tasks.assign',
    'documents.view', 'documents.upload', 'documents.bulk_import',
    'documents.approve', 'documents.make_live', 'documents.attach',
    'content.view', 'content.upload', 'content.publish', 'content.attach',
    'echoes.view', 'echoes.confirm', 'echoes.assign', 'echoes.close',
    'analytics.view'
]);

SELECT grant_role_permissions('tenant', 'member', ARRAY[
    'people.view'
]);

SELECT grant_role_permissions('site', 'site_manager', ARRAY[
    'nav.jobs', 'nav.queue', 'nav.analytics', 'nav.sites', 'nav.spaces',
    'nav.content', 'nav.docs', 'nav.users',
    'people.view', 'people.invite',
    'sites.view', 'spaces.view', 'spaces.create', 'spaces.qr_print',
    'tasks.view', 'tasks.create', 'tasks.duplicate', 'tasks.assign',
    'documents.view', 'documents.upload', 'documents.attach',
    'content.view', 'content.attach',
    'echoes.view', 'echoes.confirm', 'echoes.assign', 'echoes.close',
    'analytics.view'
]);

SELECT grant_role_permissions('site', 'supervisor', ARRAY[
    'nav.jobs', 'nav.queue', 'nav.analytics', 'nav.sites', 'nav.spaces',
    'nav.content', 'nav.docs',
    'sites.view', 'spaces.view', 'spaces.qr_print',
    'tasks.view',
    'documents.view',
    'content.view', 'content.contact_admin',
    'echoes.view', 'echoes.confirm', 'echoes.close',
    'analytics.view'
]);

SELECT grant_role_permissions('site', 'worker', ARRAY[
    'pulse.start', 'echoes.create', 'echoes.view',
    'tasks.view', 'documents.view', 'content.view'
]);

DROP FUNCTION grant_role_permissions(text, text, text[]);

-- ---------------------------------------------------------------------
-- updated_at triggers (tables in this phase)
-- ---------------------------------------------------------------------

CREATE TRIGGER trg_app_user_updated_at               BEFORE UPDATE ON app_user
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_auth_token_updated_at             BEFORE UPDATE ON auth_token
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tenant_updated_at                 BEFORE UPDATE ON tenant
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_user_tenant_membership_updated_at BEFORE UPDATE ON user_tenant_membership
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_site_updated_at                   BEFORE UPDATE ON site
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_role_updated_at                   BEFORE UPDATE ON role
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_user_site_membership_updated_at   BEFORE UPDATE ON user_site_membership
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_permission_updated_at             BEFORE UPDATE ON permission
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_role_permission_updated_at        BEFORE UPDATE ON role_permission
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_space_updated_at                  BEFORE UPDATE ON space
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tenant_privacy_request_updated_at BEFORE UPDATE ON tenant_privacy_request
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- Seed platform admin (plain SQL — works in pgAdmin)
-- Change v_admin_email if you will request OTP on a different address.
-- ---------------------------------------------------------------------

DO $$
DECLARE
    v_admin_email text := 'admin@safein5.com';
    v_user_id integer;
    v_tenant_id integer;
BEGIN
    INSERT INTO app_user (
        email,
        first_name,
        last_name,
        account_status,
        is_platform_admin,
        email_verified_at
    )
    VALUES (
        v_admin_email,
        'Platform',
        'Admin',
        'active',
        true,
        now()
    )
    ON CONFLICT (email) DO UPDATE
    SET
        is_platform_admin = true,
        account_status = 'active',
        first_name = COALESCE(app_user.first_name, EXCLUDED.first_name),
        last_name = COALESCE(app_user.last_name, EXCLUDED.last_name);

    SELECT id INTO v_user_id FROM app_user WHERE email = v_admin_email;
    SELECT id INTO v_tenant_id
    FROM tenant
    WHERE kind = 'community'
    ORDER BY id
    LIMIT 1;

    INSERT INTO user_tenant_membership (user_id, tenant_id, role)
    VALUES (v_user_id, v_tenant_id, 'member')
    ON CONFLICT (user_id, tenant_id) DO NOTHING;
END $$;
