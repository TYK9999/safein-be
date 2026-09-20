-- ---------------------------------------------------------------------
-- Tenancy (client org) + sites + spaces (QR)
-- ---------------------------------------------------------------------

CREATE TABLE tenant (
    id          integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        text        NOT NULL,
    kind        text        NOT NULL DEFAULT 'community'
                CHECK (kind IN ('community', 'corporate')),
    -- Domain or general address (onboarding + invite email check). Not unique.
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

-- Org membership only. One person may belong to a tenant once; many people
-- may be tenant_admin for the same tenant (there is no unique on role).
-- Worker / supervisor / site_manager are NEVER stored here — those vary by
-- site (a person can be supervisor at Plant A and worker at Silo Rd).
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
    name            text        NOT NULL,          -- Plant A, Silo Rd, Workshop
    location        text,                          -- Add a site: Site location
    -- Site manager / supervisor are user_site_membership rows (role.key),
    -- not columns on site. A site may have many of each.
    -- Manual "Add a site" waits for Client Admin approval; bulk import is live.
    approval_status text        NOT NULL DEFAULT 'approved'
                    CHECK (approval_status IN ('pending', 'approved')),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    created_by      integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by      integer     REFERENCES app_user (id) ON DELETE SET NULL
);
CREATE INDEX idx_site_tenant ON site (tenant_id, name);

-- Canonical roles for platform, tenant, and site scope. Memberships and
-- role_permission (access.sql) both reference this table by role_id.
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

-- Role AT a site. UNIQUE (user_id, site_id) means one role per person per
-- site, not one supervisor per site. Same person, other site → other role.
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

-- Physical / logical place. Scanning QR starts a Task PULSE.
CREATE TABLE space (
    id                   integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id            integer     NOT NULL REFERENCES tenant (id),
    site_id              integer     NOT NULL REFERENCES site (id),
    name                 text        NOT NULL,          -- Tank 3A
    location             text,                          -- North tank farm
    asset_type           text,                          -- Storage tank · confined space
    task_type            text,                          -- confined space entry, grinding, access route, ...
    qr_code              text        UNIQUE,            -- SIS-QR-0031
    permit_required      boolean     NOT NULL DEFAULT false,
    rescue_plan_required boolean     NOT NULL DEFAULT false,
    content_owner_user_id integer    REFERENCES app_user (id) ON DELETE SET NULL,
    owner_rule           text,                          -- e.g. "Supervisor, Plant A"
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
