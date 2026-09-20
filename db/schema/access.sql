-- ---------------------------------------------------------------------
-- Access control. `role` is defined in tenancy.sql (needed by
-- user_site_membership). These tables are the capability catalog
-- the API returns on login for the React app.
-- Effective grants = union of platform_admin (if flagged) + tenant role
-- + every site role the person holds.
--
-- Row visibility (see header) is separate from capability grants and is
-- returned as permissions.dataScope on login.
-- ---------------------------------------------------------------------

CREATE TABLE permission (
    id           integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    resource     text        NOT NULL,          -- nav, clients, sites, …
    action       text        NOT NULL,          -- view, create, assign, …
    description  text        NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    created_by   integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by   integer     REFERENCES app_user (id) ON DELETE SET NULL,
    UNIQUE (resource, action)
);
CREATE INDEX idx_permission_resource ON permission (resource, action);

-- role_permission links permission grants to rows in role (scope + key).
--   platform / platform_admin  → app_user.is_platform_admin
--   tenant   / tenant_admin|member → user_tenant_membership.role (text for now)
--   site     / worker|supervisor|site_manager → user_site_membership.role_id
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

-- SafeIn5 admin: every capability.
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
CROSS JOIN permission p
WHERE r.scope = 'platform' AND r.key = 'platform_admin';

-- Client admin (docs/index.html role=tenant).
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

-- Org member with no site job yet (invited, waiting for a site role).
SELECT grant_role_permissions('tenant', 'member', ARRAY[
    'people.view'
]);

-- Site manager: site-scoped admin-like access, no client-wide invites/bulk.
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

-- Supervisor (docs/index.html role=supervisor). View + confirm, no assign/create.
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

-- Worker: PWA journey, not back-office nav.
SELECT grant_role_permissions('site', 'worker', ARRAY[
    'pulse.start', 'echoes.create', 'echoes.view',
    'tasks.view', 'documents.view', 'content.view'
]);

DROP FUNCTION grant_role_permissions(text, text, text[]);
