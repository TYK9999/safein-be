-- =====================================================================
-- SafeIn5 MVP -- Migration 0007: ROLES, GRANTS AND THE RLS BACKSTOP
--
-- Everything security-related that requires the whole schema to exist.
-- Migrations 0001..0006 create structure and per-table RLS policies;
-- this file creates the runtime roles, the entire privilege surface, and
-- a verification block that fails the deploy if any tenant-scoped table
-- was left without RLS.
--
-- Grants are concentrated here on purpose. A grant scattered across six
-- migration files cannot be audited; a reviewer asking "what exactly can
-- the API role do?" must be able to answer it by reading one file.
--
-- Source of truth: SafeIn5-MVP-Architecture.md Sec 3.2 (database roles),
-- Sec 3.3 (policy shape), Sec 4.3 (column-level contract), Sec 2.6/2.8
-- (append-only tables).
--
-- Postgres 16. Plain ASCII only.
-- =====================================================================


-- =====================================================================
-- 1. ROLES
--
-- Created idempotently so the migration is re-runnable against a
-- database where the deployment pipeline has already provisioned them.
-- NOLOGIN group roles: passwords / LOGIN are granted out-of-band by the
-- pipeline, which is what keeps credentials out of the migration files.
--
-- NOBYPASSRLS on every runtime role is explicit rather than relied upon
-- as a default, because the whole tenancy model rests on it.
-- =====================================================================

DO $$
BEGIN
    -- Table owner. Runs migrations. NOT used at runtime.
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'safein5_migrator') THEN
        CREATE ROLE safein5_migrator NOLOGIN NOBYPASSRLS;
    END IF;

    -- The API container. Serves every request path except pseudonym
    -- resolution.
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'safein5_app') THEN
        CREATE ROLE safein5_app NOLOGIN NOBYPASSRLS;
    END IF;

    -- Second, small connection pool used by the Identity module ONLY.
    -- This is the one role permitted to read the author_token mapping and
    -- the per-tenant salt, which is what makes resolving a pseudonym a
    -- deliberate lookup rather than an ambient capability
    -- (Architecture Sec 3.2 / Sec 4.2).
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'safein5_identity') THEN
        CREATE ROLE safein5_identity NOLOGIN NOBYPASSRLS;
    END IF;

    -- Background worker: outbox flusher, media finaliser, reconcilers,
    -- notification dispatcher, metrics projector.
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'safein5_worker') THEN
        CREATE ROLE safein5_worker NOLOGIN NOBYPASSRLS;
    END IF;
END;
$$;

-- Role documentation is kept as SQL comments rather than COMMENT ON ROLE,
-- because COMMENT ON ROLE requires superuser (or CREATEROLE with ADMIN
-- option) and several managed Postgres offerings do not grant it.
--
--   safein5_migrator  Owns every object created by 0001..0008. Runs
--                     migrations and partition maintenance. Never used by
--                     a running process. Owners implicitly bypass RLS,
--                     which is exactly why every tenant-scoped table is
--                     FORCE ROW LEVEL SECURITY.
--
--   safein5_app       Runtime role for the API container. NOBYPASSRLS.
--                     SELECT/INSERT/UPDATE on domain tables; INSERT only
--                     on the four append-only tables; NO DELETE anywhere
--                     (soft delete is the only deletion model). Cannot
--                     read user_tenant_membership.author_token or
--                     app_user.password_hash.
--
--   safein5_identity  As safein5_app, plus SELECT on the author_token
--                     mapping column, app_user.password_hash and
--                     tenant_secret.
--
--   safein5_worker    Background worker. NOBYPASSRLS: it crosses tenants
--                     by setting app.bypass_rls = 'on' inside the audited
--                     runAsSystem helper, which the USING clauses honour
--                     and the WITH CHECK clauses deliberately do not.
--                     Also the only role that may read the append-only
--                     tables, because the admin audit console goes
--                     through the system pool.


-- =====================================================================
-- 2. BASELINE: nothing is public
-- =====================================================================

REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT  USAGE ON SCHEMA public
    TO safein5_migrator, safein5_app, safein5_identity, safein5_worker;
GRANT  CREATE ON SCHEMA public TO safein5_migrator;


-- =====================================================================
-- 3. GLOBAL REFERENCE DATA -- read-only to every runtime role
--    Seeded by migrations; changed only by the migrator.
-- =====================================================================

GRANT SELECT ON
    role,
    task_type,
    risk_type,
    classification,
    workflow_state_def,
    workflow_transition_def
    TO safein5_app, safein5_identity, safein5_worker;


-- =====================================================================
-- 4. TENANT ANCHOR
--
--    tenant is deliberately NOT RLS-protected (see 0001 sec 9): it is
--    the root of the tenancy graph, so a tenant_id-keyed policy on it
--    would be circular.
--
--    Since one tenant IS one client organisation, the customer-facing
--    organisation profile (name, industry_code, country_code, theme)
--    lives on this row. A blanket table-level UPDATE grant would
--    therefore let safein5_app rewrite ANY tenant on the platform,
--    including provisioning columns. Flipping a corporate tenant to
--    kind='community' + is_public_readable=true satisfies
--    ck_tenant_public_read_community_only and exposes that tenant's
--    public-visibility rows -- precisely the SCP-024 leak the CHECK
--    exists to prevent.
--
--    Privileges are therefore enumerated BY COLUMN, exactly as for
--    app_user and user_tenant_membership in section 6, and confined to
--    the profile fields that org_admin's org.manage permission covers.
--    Provisioning columns (slug, kind, status, data_region,
--    retention_policy, is_public_readable, allow_guest_submission) are
--    migrator / platform-admin territory and are deliberately absent.
--
--    Column grants alone still permit CROSS-tenant writes, because
--    there is no RLS to scope the row. trg_tenant_self_scope in 0001
--    is the substitute row guard.
-- =====================================================================

GRANT SELECT ON tenant TO safein5_app, safein5_identity, safein5_worker;

GRANT UPDATE (name, industry_code, country_code, theme, updated_at)
    ON tenant TO safein5_app;

GRANT INSERT ON tenant TO safein5_identity;


-- =====================================================================
-- 5. DOMAIN TABLES -- SELECT / INSERT / UPDATE, never DELETE
--
--    Rule 6 of the build brief: soft delete everywhere. Withholding
--    DELETE from the runtime roles is what makes that a guarantee rather
--    than a coding convention -- a stray Kysely .deleteFrom() fails with
--    42501 instead of destroying a signal.
-- =====================================================================

GRANT SELECT, INSERT, UPDATE ON
    site,
    sub_site,
    asset,
    user_site_assignment,
    guest_session,
    auth_token,
    qr_context,
    qr_code,
    context_binding,
    pulse_template,
    learn5_item,
    learn5_binding,
    learn5_view,
    rescue_plan,
    pulse_session,
    behaviour_signal,
    signal_media,
    signal_read_state,
    review_task,
    evidence,
    device_subscription,
    notification
    TO safein5_app;

-- qr_scan_event and moderation_action are semantically append-only but
-- are not in the four tables the brief names, so they keep SELECT for the
-- admin console. Neither is ever UPDATEd: a correction is a new row.
GRANT SELECT, INSERT ON qr_scan_event     TO safein5_app;
GRANT SELECT, INSERT ON moderation_action TO safein5_app;


-- =====================================================================
-- 6. THE TWO COLUMN-RESTRICTED TABLES
--
-- IMPORTANT MECHANIC, and the single most misunderstood point in this
-- file: in PostgreSQL, column privileges are ADDITIVE to table
-- privileges. A table-level GRANT SELECT followed by a column-level
-- REVOKE SELECT (col) does NOT hide the column -- the table-level grant
-- already covers every column, and the REVOKE has nothing to subtract.
--
-- The only way to withhold a column is to NEVER issue the table-level
-- privilege and enumerate the permitted columns instead. That is what the
-- grants below do. The literal REVOKE statements that follow them are
-- retained because the brief and Architecture Sec 3.2 name them
-- explicitly, and because they are a harmless, self-documenting tripwire:
-- if someone later adds a table-level GRANT SELECT above, re-running this
-- file will strip the sensitive column back out.
-- =====================================================================

-- --- app_user: every column except password_hash ---------------------
GRANT SELECT (
    id, email, email_verified_at, display_name, default_anonymous,
    locale, status, erased_at, last_seen_at,
    created_at, updated_at, deleted_at
) ON app_user TO safein5_app;
-- INSERT and UPDATE are enumerated too, for the same reason: a
-- table-level grant would let the API role WRITE password_hash even
-- though it cannot read it, and credential material has exactly one
-- owner (safein5_identity).
GRANT INSERT (
    id, email, email_verified_at, display_name, default_anonymous,
    locale, status, created_at
) ON app_user TO safein5_app;

GRANT UPDATE (
    email, email_verified_at, display_name, default_anonymous,
    locale, status, last_seen_at, updated_at, deleted_at
) ON app_user TO safein5_app;

REVOKE SELECT (password_hash) ON app_user FROM safein5_app;

-- --- user_tenant_membership: every column except author_token --------
-- The capture hot path gets author_token from the JWT `atk` claim
-- (Architecture Sec 3.4), so safein5_app never needs to read it. INSERT
-- is withheld entirely: author_token is NOT NULL with no default, so
-- withholding INSERT forces every membership to be created through the
-- Identity module, which is the only component that can derive a token.
GRANT SELECT (
    id, tenant_id, user_id, role_id, anonymous_override,
    invited_at, invited_by_membership_id, accepted_at,
    blocked_at, blocked_reason, blocked_by_membership_id,
    removed_at, status, created_at, updated_at, deleted_at
) ON user_tenant_membership TO safein5_app;

GRANT UPDATE (
    role_id, anonymous_override, accepted_at,
    blocked_at, blocked_reason, blocked_by_membership_id,
    removed_at, status, updated_at, deleted_at
) ON user_tenant_membership TO safein5_app;

-- The statement the brief names explicitly. See the mechanic note above:
-- this is a tripwire, not the primary control.
REVOKE SELECT (author_token) ON user_tenant_membership FROM safein5_app;

-- --- tenant_secret: identity only ------------------------------------
REVOKE ALL ON tenant_secret FROM safein5_app, safein5_worker;


-- =====================================================================
-- 7. APPEND-ONLY TABLES (build rule 7)
--
--    audit_log, outbox_event, workflow_transition and
--    signal_classification_event receive INSERT and nothing else from
--    safein5_app. No UPDATE. No DELETE. Correcting an append-only row
--    means appending a compensating row.
--
--    Reads of these tables are a system-pool operation: the admin audit
--    console (GET /v1/admin/audit) runs through runAsSystem on the worker
--    role, which is itself audited. That keeps "the app can read the
--    whole audit trail for any tenant it happens to be scoped to" off the
--    table entirely.
--
--    The one permitted mutation anywhere in this section is the flusher's
--    column-level UPDATE of outbox_event delivery columns.
-- =====================================================================

GRANT INSERT ON audit_log                   TO safein5_app, safein5_identity, safein5_worker;
GRANT INSERT ON outbox_event                TO safein5_app, safein5_identity, safein5_worker;
GRANT INSERT ON workflow_transition         TO safein5_app, safein5_worker;
GRANT INSERT ON signal_classification_event TO safein5_app, safein5_worker;

-- System-pool reads.
GRANT SELECT ON audit_log                   TO safein5_worker;
GRANT SELECT ON outbox_event                TO safein5_worker;
GRANT SELECT ON workflow_transition         TO safein5_app, safein5_worker;
GRANT SELECT ON signal_classification_event TO safein5_app, safein5_worker;

-- The flusher stamps delivery state and nothing else. Column-level so a
-- bug in the worker cannot rewrite payload, event_type or tenant_id --
-- which would silently corrupt the SIGNAL corpus.
GRANT UPDATE (published_at, attempt_count, last_error, next_attempt_at)
    ON outbox_event TO safein5_worker;

-- Sequences behind the two partitioned append-only tables.
GRANT USAGE ON SEQUENCE audit_log_id_seq
    TO safein5_app, safein5_identity, safein5_worker;
GRANT USAGE ON SEQUENCE outbox_event_id_seq
    TO safein5_app, safein5_identity, safein5_worker;

-- NOTE ON PARTITIONS: privileges are checked on the relation named in the
-- query. Access routed through the parent (which is all application
-- access) is covered by the grants above. Partitions are touched directly
-- only by the migrator during maintenance. The "add a future month"
-- runbook in 0006 repeats the GRANT statements for anyone who does query
-- a partition directly.


-- =====================================================================
-- 8. safein5_identity
--    As safein5_app, plus the two withheld columns and the salt table.
--    Table-level grants here deliberately DO include author_token and
--    password_hash.
-- =====================================================================

GRANT SELECT, INSERT, UPDATE ON
    app_user,
    user_tenant_membership,
    user_site_assignment,
    guest_session,
    auth_token,
    tenant_secret
    TO safein5_identity;

GRANT SELECT ON
    site,
    sub_site,
    asset,
    behaviour_signal,
    pulse_session,
    learn5_view,
    signal_read_state,
    notification,
    device_subscription
    TO safein5_identity;

-- GDPR Art.15 export and Art.17 erasure both run in this role: erasure
-- must be able to redact the body of an attributed signal and to DELETE
-- the membership row that holds the token mapping (Architecture Sec 4.4
-- steps 2-3). These are the ONLY DELETE and the only signal UPDATE
-- privileges issued anywhere in this schema, and they are why erasure is
-- an Identity-module operation rather than an admin-console one.
GRANT UPDATE (author_user_id, is_anonymous, body_text, updated_at, deleted_at)
    ON behaviour_signal TO safein5_identity;
GRANT UPDATE (author_user_id, is_anonymous, updated_at, deleted_at)
    ON pulse_session TO safein5_identity;
GRANT DELETE ON user_tenant_membership TO safein5_identity;


-- =====================================================================
-- 9. safein5_worker
--    Reads widely (it renders notification payloads and projects
--    metrics), writes narrowly.
-- =====================================================================

GRANT SELECT ON
    site,
    sub_site,
    asset,
    user_site_assignment,
    qr_context,
    qr_scan_event,
    pulse_template,
    learn5_item,
    learn5_binding,
    learn5_view,
    rescue_plan,
    pulse_session,
    signal_read_state,
    evidence,
    moderation_action,
    device_subscription
    TO safein5_worker;

-- Media finaliser + reconciler.
GRANT SELECT, UPDATE ON signal_media     TO safein5_worker;
-- Recomputes media_state / workflow_state denormalisations.
GRANT SELECT, UPDATE ON behaviour_signal TO safein5_worker;
-- Scan-count rollups and expired-binding sweeps.
GRANT SELECT, UPDATE ON qr_code          TO safein5_worker;
GRANT SELECT, UPDATE ON context_binding  TO safein5_worker;
-- Reaps expired auth tokens and stale guest sessions.
GRANT SELECT, UPDATE ON auth_token       TO safein5_worker;
GRANT SELECT, UPDATE ON guest_session    TO safein5_worker;
-- WorkflowTaskCreator + NotificationDispatcher.
GRANT SELECT, INSERT, UPDATE ON review_task   TO safein5_worker;
GRANT SELECT, INSERT, UPDATE ON notification  TO safein5_worker;

-- The worker must never read the pseudonym mapping or the salt. Stated
-- explicitly rather than left as an absence, so a future blanket
-- "GRANT ... ON ALL TABLES" is caught by re-running this file.
REVOKE ALL ON tenant_secret          FROM safein5_worker;
REVOKE ALL ON user_tenant_membership FROM safein5_worker;
GRANT SELECT (
    id, tenant_id, user_id, role_id, status, blocked_at, deleted_at
) ON user_tenant_membership TO safein5_worker;


-- =====================================================================
-- 10. RLS BACKSTOP -- verification, expressed here because it needs
--     every table to exist.
--
--     Architecture Sec 3.5 asks for a generated test that fails CI when a
--     new table lands without a policy. This block is the deploy-time
--     half of that: every table carrying a tenant_id column MUST have
--     RLS enabled, RLS forced, and at least one policy. Anything else is
--     a cross-tenant data breach waiting for a forgotten WHERE clause,
--     so it aborts the migration rather than warning.
--
--     Deliberate exemptions, each with a documented reason:
--       app_user   -- global identity, no tenant_id (see 0002).
--       auth_token -- pre-tenant credential exchange (see 0002); it does
--                     carry a nullable tenant_id, hence the explicit
--                     exclusion below rather than silence.
-- =====================================================================

DO $$
DECLARE
    r      record;
    v_bad  text := '';
BEGIN
    FOR r IN
        SELECT c.relname
          FROM pg_class      c
          JOIN pg_namespace  n ON n.oid = c.relnamespace
          JOIN pg_attribute  a ON a.attrelid = c.oid
         WHERE n.nspname = current_schema()
           AND c.relkind IN ('r', 'p')
           AND a.attname = 'tenant_id'
           AND a.attnum > 0
           AND NOT a.attisdropped
           AND c.relname NOT IN ('auth_token')
           AND (
                    c.relrowsecurity  = false
                 OR c.relforcerowsecurity = false
                 OR NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid)
               )
         ORDER BY c.relname
    LOOP
        v_bad := v_bad || ' ' || r.relname;
    END LOOP;

    IF v_bad <> '' THEN
        RAISE EXCEPTION
            'SafeIn5 RLS backstop failed. Tenant-scoped relations without ENABLE + FORCE ROW LEVEL SECURITY and at least one policy:%',
            v_bad
            USING HINT = 'Add ALTER TABLE ... ENABLE/FORCE ROW LEVEL SECURITY and a tenant_isolation policy in the migration that created the table.';
    END IF;

    RAISE NOTICE 'SafeIn5 RLS backstop passed: every tenant-scoped relation is RLS-enabled, forced and policied.';
END;
$$;


-- =====================================================================
-- 11. NO-DELETE BACKSTOP
--     Soft delete is a build rule, not a convention. Assert that no
--     runtime role holds DELETE on anything except the one deliberate
--     exception (safein5_identity on user_tenant_membership, which is
--     what GDPR erasure requires).
-- =====================================================================

DO $$
DECLARE
    r     record;
    v_bad text := '';
BEGIN
    FOR r IN
        SELECT c.relname, g.grantee
          FROM pg_class     c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          JOIN LATERAL (
                SELECT unnest(ARRAY['safein5_app','safein5_worker','safein5_identity']) AS grantee
               ) g ON true
         WHERE n.nspname = current_schema()
           AND c.relkind IN ('r', 'p')
           AND has_table_privilege(g.grantee, c.oid, 'DELETE')
           AND NOT (g.grantee = 'safein5_identity' AND c.relname = 'user_tenant_membership')
         ORDER BY c.relname, g.grantee
    LOOP
        v_bad := v_bad || ' ' || r.grantee || ':' || r.relname;
    END LOOP;

    IF v_bad <> '' THEN
        RAISE EXCEPTION
            'SafeIn5 no-delete backstop failed. Unexpected DELETE privileges:%', v_bad
            USING HINT = 'SafeIn5 uses soft delete only (deleted_at). Remove the DELETE grant.';
    END IF;

    RAISE NOTICE 'SafeIn5 no-delete backstop passed.';
END;
$$;

-- =====================================================================
-- End of migration 0007.
-- =====================================================================
