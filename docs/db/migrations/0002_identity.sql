-- =====================================================================
-- SafeIn5 MVP -- Migration 0002: IDENTITY
-- Users, memberships, site assignments, guest sessions, auth artefacts,
-- per-tenant anonymity salt.
--
-- Source of truth: SafeIn5-MVP-Architecture.md
--   Sec 2.2 (Identity, Membership, Anonymity)
--   Sec 3   (Multi-tenancy and RLS)
--   Sec 4   (Anonymity implementation / author_token derivation)
--   Sec 8   (Outbox taxonomy -- user.invited / accepted / blocked / erased)
--
-- Depends on 0001_foundation.sql: tenant, site, sub_site,
-- asset, role, set_updated_at().
--
-- Roles and grants live in 0007_rls_roles.sql, not here.
-- Postgres 16. Extensions: pgcrypto, citext only. Plain ASCII only.
-- =====================================================================


-- =====================================================================
-- 1. app_user -- GLOBAL identity
-- =====================================================================
-- Named app_user, NOT "user": user is a reserved word in Postgres and
-- every unquoted reference would silently resolve to the CURRENT_USER
-- function. Every later migration references app_user by this name.
--
-- This table is deliberately NOT tenant-scoped and NOT RLS-protected.
-- Rationale (CQA-001 / SCP-001): a person must be able to hold a
-- Community account and later join a Corporate tenant -- or belong to two
-- corporate tenants as a contractor -- WITHOUT re-registering. A tenant_id
-- on the identity row would make that a data migration instead of an
-- INSERT into user_tenant_membership.
--
-- How it is protected instead, since RLS cannot apply:
--   (a) All tenant-visible reads go through user_tenant_membership, which
--       IS RLS-scoped.
--   (b) The application layer never accepts a raw user_id from a client;
--       it resolves the actor from the JWT (Architecture Sec 3.4).
--   (c) Column privileges: safein5_app is granted SELECT on every column
--       EXCEPT password_hash; only safein5_identity can read it (0007).
--   (d) email is PII and is redacted by the audit serialiser allowlist;
--       it never enters outbox_event payloads (Architecture Sec 4.3).
-- =====================================================================
CREATE TABLE app_user (
  id                 uuid        NOT NULL DEFAULT gen_random_uuid(),
  email              citext      NULL,
  email_verified_at  timestamptz NULL,
  display_name       text        NULL,
  password_hash      text        NULL,
  default_anonymous  boolean     NOT NULL DEFAULT false,
  locale             text        NOT NULL DEFAULT 'en-GB',
  status             text        NOT NULL DEFAULT 'active',
  erased_at          timestamptz NULL,
  last_seen_at       timestamptz NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NULL,
  deleted_at         timestamptz NULL,

  CONSTRAINT pk_app_user
    PRIMARY KEY (id),

  CONSTRAINT ck_app_user_status
    CHECK (status IN ('active', 'blocked', 'erased')),

  -- GDPR Art.17 tombstone shape (Architecture Sec 4.4 step 1): an erased
  -- account keeps its id (so FKs never dangle) but must carry no
  -- identifiers at all. Enforced in the DB, not only in the service, so a
  -- half-finished erasure cannot commit.
  CONSTRAINT ck_app_user_erased_is_scrubbed
    CHECK (
      status <> 'erased'
      OR (erased_at IS NOT NULL
          AND email IS NULL
          AND display_name IS NULL
          AND password_hash IS NULL)
    ),

  CONSTRAINT ck_app_user_erased_at_requires_status
    CHECK (erased_at IS NULL OR status = 'erased'),

  -- An account cannot be email-verified without an email.
  CONSTRAINT ck_app_user_verified_requires_email
    CHECK (email_verified_at IS NULL OR email IS NOT NULL),

  CONSTRAINT ck_app_user_locale_format
    CHECK (locale ~ '^[a-z]{2}(-[A-Za-z0-9]{2,8})*$')
);

-- Partial unique: NULL email is legal and repeatable (guest-derived and
-- erased accounts both have none). citext gives case-insensitive
-- uniqueness without a lower() expression index.
CREATE UNIQUE INDEX uq_app_user_email
  ON app_user (email)
  WHERE email IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_app_user_status
  ON app_user (status)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_app_user_last_seen_at
  ON app_user (last_seen_at DESC)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_app_user_updated_at
  BEFORE UPDATE ON app_user
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE app_user IS
  'Global (NOT tenant-scoped, NOT RLS-scoped) person identity. One row per human across all tenants, so a Community user can join a Corporate tenant without re-registering (CQA-001/SCP-001). Tenant-specific facts live on user_tenant_membership. Named app_user because "user" is a Postgres reserved word.';
COMMENT ON COLUMN app_user.email IS
  'Nullable: guest-derived accounts have no email until they register, and GDPR erasure sets it back to NULL. citext + partial unique index gives case-insensitive uniqueness over non-null values only.';
COMMENT ON COLUMN app_user.password_hash IS
  'bcrypt. Admin/supervisor console logins only (ADM-001/002). Workers authenticate by magic link or email OTP and this stays NULL forever. SELECT on this column is withheld from safein5_app and granted only to safein5_identity (0007).';
COMMENT ON COLUMN app_user.default_anonymous IS
  'Account-level anonymity toggle (PRD Sec 5.5). This is the DEFAULT applied at capture time; user_tenant_membership.anonymous_override wins per tenant. Changing it never rewrites already-captured signals -- behaviour_signal.is_anonymous is materialised at capture (Architecture Sec 2.4).';
COMMENT ON COLUMN app_user.locale IS
  '[SIGNAL / Phase-2 i18n] Written at MVP, unread by any MVP feature. BCP-47-ish tag, default en-GB for the UK quarry pilot.';
COMMENT ON COLUMN app_user.status IS
  'active | blocked | erased. Enumeration is text + CHECK, never a PG ENUM, so Phase 2 adds a state with an ALTER of the CHECK rather than ALTER TYPE.';
COMMENT ON COLUMN app_user.erased_at IS
  'GDPR Art.17 tombstone timestamp (Architecture Sec 4.4). Erasure NEVER deletes this row: it scrubs identifiers here and DESTROYS the token mapping in user_tenant_membership, after which author_token is mathematically unresolvable and the retained safety signals cease to be personal data.';
COMMENT ON COLUMN app_user.last_seen_at IS
  'Coarse activity marker for the admin user directory (ADM-024). Not an audit trail -- audit_log is.';
COMMENT ON COLUMN app_user.deleted_at IS
  'Soft delete. Nothing in SafeIn5 hard-deletes an identity; erasure is tombstoning (status=erased) plus mapping destruction, never a DELETE.';


-- =====================================================================
-- 2. user_tenant_membership -- the join AND the anonymity keystone
-- =====================================================================
-- Architecture Sec 2.2 and Sec 4.2/4.3. This table holds the ONLY stored
-- mapping from a person to their per-tenant pseudonym. author_token is
-- withheld from safein5_app by column-level GRANT in 0007: the role that
-- serves the capture hot path literally cannot read it (the token is
-- carried in the JWT `atk` claim instead -- Architecture Sec 3.4).
-- =====================================================================
CREATE TABLE user_tenant_membership (
  id                       uuid        NOT NULL DEFAULT gen_random_uuid(),
  tenant_id                uuid        NOT NULL,
  user_id                  uuid        NOT NULL,
  role_id                  uuid        NOT NULL,
  author_token             char(32)    NOT NULL,
  anonymous_override       boolean     NULL,
  invited_at               timestamptz NULL,
  invited_by_membership_id uuid        NULL,
  accepted_at              timestamptz NULL,
  blocked_at               timestamptz NULL,
  blocked_reason           text        NULL,
  blocked_by_membership_id uuid        NULL,
  removed_at               timestamptz NULL,
  status                   text        NOT NULL DEFAULT 'invited',
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NULL,
  deleted_at               timestamptz NULL,

  CONSTRAINT pk_user_tenant_membership
    PRIMARY KEY (id),

  CONSTRAINT fk_user_tenant_membership_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenant (id),

  CONSTRAINT fk_user_tenant_membership_user
    FOREIGN KEY (user_id) REFERENCES app_user (id),

  -- role is a global seeded reference table created in 0001
  -- (worker | supervisor | org_admin | platform_admin | moderator).
  CONSTRAINT fk_user_tenant_membership_role
    FOREIGN KEY (role_id) REFERENCES role (id),

  -- ON DELETE SET NULL on both self-references: GDPR erasure genuinely
  -- DELETEs membership rows (Architecture Sec 4.4 step 2). An erased
  -- admin who once sent an invitation must not make that invitee's row
  -- undeletable, and the erasure must not fail on a dangling reference.
  CONSTRAINT fk_user_tenant_membership_invited_by
    FOREIGN KEY (invited_by_membership_id) REFERENCES user_tenant_membership (id)
    ON DELETE SET NULL,

  CONSTRAINT fk_user_tenant_membership_blocked_by
    FOREIGN KEY (blocked_by_membership_id) REFERENCES user_tenant_membership (id)
    ON DELETE SET NULL,

  CONSTRAINT ck_user_tenant_membership_status
    CHECK (status IN ('invited', 'active', 'blocked', 'removed')),

  -- base32 of a 20-byte HMAC slice = 32 unpadded uppercase characters.
  -- The pattern is deliberately permissive over uppercase alphanumerics
  -- rather than pinned to one base32 alphabet, so the encoder can be
  -- swapped (RFC4648 vs Crockford) without a CHECK migration.
  CONSTRAINT ck_user_tenant_membership_author_token_format
    CHECK (author_token ~ '^[0-9A-Z]{32}$'),

  CONSTRAINT ck_user_tenant_membership_blocked_consistent
    CHECK ((status = 'blocked') = (blocked_at IS NOT NULL)),

  CONSTRAINT ck_user_tenant_membership_removed_consistent
    CHECK (status <> 'removed' OR removed_at IS NOT NULL),

  -- You cannot accept an invitation you were never sent.
  CONSTRAINT ck_user_tenant_membership_accepted_requires_invited
    CHECK (accepted_at IS NULL OR invited_at IS NOT NULL),

  CONSTRAINT ck_user_tenant_membership_blocked_reason_requires_block
    CHECK (blocked_reason IS NULL OR blocked_at IS NOT NULL)
);

-- Composite key target for cross-tenant-safe FKs from later migrations
-- (user_site_assignment, review_task, workflow_transition, evidence).
ALTER TABLE user_tenant_membership
  ADD CONSTRAINT uq_user_tenant_membership_id_tenant UNIQUE (id, tenant_id);

-- One membership per person per tenant. NOT partial on deleted_at: a
-- removed membership must still block a silent duplicate re-add, because
-- a second row would mint a SECOND author_token for the same person and
-- split their repeat-usage history (the pilot's primary success metric).
-- Re-joining reactivates the existing row and reuses the existing token.
CREATE UNIQUE INDEX uq_user_tenant_membership_user_tenant
  ON user_tenant_membership (user_id, tenant_id);

-- The pseudonym is unique WITHIN a tenant. It is deliberately NOT unique
-- globally: the same person is a different pseudonym in Community and in
-- their employer's tenant (per-tenant salt, Architecture Sec 4.2), which
-- is what stops a corporate admin correlating a worker's community posts.
CREATE UNIQUE INDEX uq_user_tenant_membership_tenant_author_token
  ON user_tenant_membership (tenant_id, author_token);

CREATE INDEX idx_user_tenant_membership_tenant_status
  ON user_tenant_membership (tenant_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_user_tenant_membership_user
  ON user_tenant_membership (user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_user_tenant_membership_tenant_role
  ON user_tenant_membership (tenant_id, role_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_user_tenant_membership_updated_at
  BEFORE UPDATE ON user_tenant_membership
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE user_tenant_membership IS
  'Person x tenant join, and the anonymity keystone: it holds the only stored mapping from a user to their per-tenant pseudonymous author_token (Architecture Sec 2.2/4.2). Roles, invitation state, blocking and the anonymity override are all per-tenant facts and live here, not on app_user.';
COMMENT ON COLUMN user_tenant_membership.author_token IS
  'Deterministic per-user-per-tenant pseudonym: base32(HMAC-SHA256(kms_pepper, tenant_secret.author_token_salt || '':'' || user_id)[0..19]), 32 chars. safein5_app is granted SELECT column-by-column on this table with author_token OMITTED, so the pseudonym mapping is a deliberate lookup (safein5_identity) rather than an ambient one. Destroying this row (GDPR erasure) makes every historical author_token permanently unresolvable.';
COMMENT ON COLUMN user_tenant_membership.anonymous_override IS
  'NULL = inherit app_user.default_anonymous. true/false = this tenant-specific choice wins. Nullable three-state on purpose: a user may post openly in their employer tenant and anonymously in Community, or the reverse.';
COMMENT ON COLUMN user_tenant_membership.invited_at IS
  'ADM-026 automated invitation dispatch. The invitation token itself lives in auth_token (kind=invitation) and is stored only as a hash.';
COMMENT ON COLUMN user_tenant_membership.accepted_at IS
  'Set when the invitee first exchanges their invitation token. invited_at -> accepted_at is the ADM-026 funnel and is emitted as user.invited / user.accepted on the outbox (Architecture Sec 8, Platform events).';
COMMENT ON COLUMN user_tenant_membership.blocked_at IS
  'Abuse blocking (Dev Pack Sec 17.2 Scenario 4). A moderator blocks a TOKEN, never a name: the API resolves signal.author_token -> this row through the Identity module only and returns nothing about who it was (Architecture Sec 4.4).';
COMMENT ON COLUMN user_tenant_membership.blocked_reason IS
  'Free-text moderator justification. Mirrored into moderation_action with the token, never the identity.';
COMMENT ON COLUMN user_tenant_membership.status IS
  'invited | active | blocked | removed. text + CHECK, never a PG ENUM. removed is a soft state -- the row and its author_token survive so historical signals stay attributable to a stable pseudonym.';
COMMENT ON COLUMN user_tenant_membership.deleted_at IS
  'Soft delete. NOTE: GDPR erasure is the one path that genuinely DELETEs rows here -- destroying the token mapping is precisely what converts retained signals into non-personal data (Architecture Sec 4.4 step 2). Every other removal sets status=removed.';


-- =====================================================================
-- 3. user_site_assignment -- TRUE many-to-many join
-- =====================================================================
-- RESOLVED CONTRADICTION -- read before changing the shape of this table.
--
-- ADM-019 (MUST) says the site-assignment picker shows "workers who are
-- not assigned to any other site", which reads as one-worker-one-site.
-- ADM-023 (MUST) puts workers "on bench" when a site is deleted, which
-- reads the same way.
--
-- WRK-015, WRK-016, WRK-017 and WRK-018 (all MUST) require that a worker
-- who moves to another site or sub-site scans the QR there and has the
-- app context update "without friction" -- i.e. workers demonstrably move
-- between sites. The pilot also runs contractors, hauliers and plant-hire
-- operators across 3 organisations (i.e. 3 tenants) on one platform.
--
-- DECISION: this is a TRUE join table. One membership may hold MANY
-- concurrent site assignments. ADM-019's "not assigned to any other site"
-- is implemented as the DEFAULT FILTER on the admin picker (a UI
-- affordance), not as a database constraint. is_primary carries the
-- "which site is this worker's home" semantic that ADM-019 actually needs
-- for bench/roster reporting.
--
-- See SafeIn5-MVP-Open-Questions.md, multi-site membership, option 1.
-- =====================================================================
CREATE TABLE user_site_assignment (
  id                        uuid        NOT NULL DEFAULT gen_random_uuid(),
  tenant_id                 uuid        NOT NULL,
  membership_id             uuid        NOT NULL,
  site_id                   uuid        NOT NULL,
  sub_site_id               uuid        NULL,
  is_primary                boolean     NOT NULL DEFAULT false,
  assignment_source         text        NOT NULL DEFAULT 'admin',
  assigned_at               timestamptz NOT NULL DEFAULT now(),
  assigned_by_membership_id uuid        NULL,
  unassigned_at             timestamptz NULL,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NULL,
  deleted_at                timestamptz NULL,

  CONSTRAINT pk_user_site_assignment
    PRIMARY KEY (id),

  CONSTRAINT fk_user_site_assignment_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenant (id),

  -- Composite FKs: the membership, the site and the sub-site must all
  -- live in the SAME tenant as the assignment row.
  --
  -- ON DELETE CASCADE on the owning membership, and only there: GDPR
  -- erasure DELETEs the membership row to destroy the pseudonym mapping,
  -- and a roster entry for a person who no longer has a membership is
  -- meaningless operational state carrying no safety value. Without the
  -- cascade the documented erasure path (Architecture Sec 4.4 step 2)
  -- would simply fail on a foreign key violation.
  CONSTRAINT fk_user_site_assignment_membership
    FOREIGN KEY (membership_id, tenant_id)
    REFERENCES user_tenant_membership (id, tenant_id) ON DELETE CASCADE,

  CONSTRAINT fk_user_site_assignment_site
    FOREIGN KEY (site_id, tenant_id) REFERENCES site (id, tenant_id),

  CONSTRAINT fk_user_site_assignment_sub_site
    FOREIGN KEY (sub_site_id, tenant_id) REFERENCES sub_site (id, tenant_id),

  -- Single-column, not composite: this one needs ON DELETE SET NULL when
  -- the assigning admin is erased, and a composite SET NULL would also
  -- null tenant_id, which is NOT NULL.
  CONSTRAINT fk_user_site_assignment_assigned_by
    FOREIGN KEY (assigned_by_membership_id)
    REFERENCES user_tenant_membership (id) ON DELETE SET NULL,

  CONSTRAINT ck_user_site_assignment_source
    CHECK (assignment_source IN ('admin', 'invitation', 'self_service', 'qr_scan', 'import')),

  CONSTRAINT ck_user_site_assignment_unassigned_after_assigned
    CHECK (unassigned_at IS NULL OR unassigned_at >= assigned_at)
);

-- Uniqueness is expressed as two partial indexes because sub_site_id is
-- nullable and NULLs do not collide in a plain unique index. Scoped to
-- live assignments only, so a worker can be re-assigned to a site they
-- previously left without tripping the constraint.
CREATE UNIQUE INDEX uq_user_site_assignment_membership_site
  ON user_site_assignment (membership_id, site_id)
  WHERE sub_site_id IS NULL AND unassigned_at IS NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX uq_user_site_assignment_membership_site_sub_site
  ON user_site_assignment (membership_id, site_id, sub_site_id)
  WHERE sub_site_id IS NOT NULL AND unassigned_at IS NULL AND deleted_at IS NULL;

-- At most one PRIMARY (home/bench) site per membership. This is the ONLY
-- place the ADM-019 one-site intuition is enforced, and it constrains the
-- home site only -- never the number of sites a worker may work at.
CREATE UNIQUE INDEX uq_user_site_assignment_one_primary
  ON user_site_assignment (membership_id)
  WHERE is_primary AND unassigned_at IS NULL AND deleted_at IS NULL;

-- Supervisor scope and notification fan-out: "who is assigned here".
CREATE INDEX idx_user_site_assignment_tenant_site
  ON user_site_assignment (tenant_id, site_id)
  WHERE unassigned_at IS NULL AND deleted_at IS NULL;

CREATE INDEX idx_user_site_assignment_tenant_sub_site
  ON user_site_assignment (tenant_id, sub_site_id)
  WHERE sub_site_id IS NOT NULL AND unassigned_at IS NULL AND deleted_at IS NULL;

-- Default feed scope: "which sites does this actor see".
CREATE INDEX idx_user_site_assignment_membership
  ON user_site_assignment (membership_id)
  WHERE unassigned_at IS NULL AND deleted_at IS NULL;

CREATE TRIGGER trg_user_site_assignment_updated_at
  BEFORE UPDATE ON user_site_assignment
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE user_site_assignment IS
  'TRUE many-to-many join: one membership may hold MANY concurrent site/sub-site assignments. Deliberately not a site_id column on user_tenant_membership -- ADM-019/023 imply one-worker-one-site but WRK-015/016/017/018 (all MUST) require workers to move between sites, and the pilot runs contractors across 3 organisations (i.e. 3 tenants). ADM-019 is honoured as a default UI filter plus the is_primary flag. Drives default feed scope (WRK-013/014) and supervisor scope.';
COMMENT ON COLUMN user_site_assignment.tenant_id IS
  'RLS anchor. Denormalised from the membership; the composite FKs force it to equal user_tenant_membership.tenant_id and site.tenant_id, so a cross-tenant assignment is structurally impossible rather than merely improbable.';
COMMENT ON COLUMN user_site_assignment.sub_site_id IS
  'Optional narrowing (ADM-027/029). NULL = assigned to the whole site. A row with a sub_site_id does not imply a separate site-level row; site scope is derived from site_id either way.';
COMMENT ON COLUMN user_site_assignment.is_primary IS
  'The worker home/bench site that ADM-019 and ADM-023 actually need. At most one live primary per membership (uq_user_site_assignment_one_primary). Never used to restrict where a worker may capture a signal.';
COMMENT ON COLUMN user_site_assignment.assignment_source IS
  '[SIGNAL] How the assignment arose: admin | invitation | self_service | qr_scan | import. Written at MVP, unread by MVP features. qr_scan anticipates WRK-015/016 auto-attachment when a worker repeatedly scans at a site they are not rostered to -- the contractor pattern.';
COMMENT ON COLUMN user_site_assignment.unassigned_at IS
  'Soft end of an assignment. Kept rather than deleted so a signal captured six months ago can still be interpreted against the roster in force at the time.';
COMMENT ON COLUMN user_site_assignment.deleted_at IS
  'Soft delete (data-entry correction). Ending an assignment normally sets unassigned_at, not this.';


-- =====================================================================
-- 4. guest_session -- unauthenticated QR journeys (WRK-003, MUST)
-- =====================================================================
CREATE TABLE guest_session (
  id                 uuid        NOT NULL DEFAULT gen_random_uuid(),
  tenant_id          uuid        NOT NULL,
  client_token_hash  char(64)    NOT NULL,
  author_token       char(32)    NOT NULL,
  first_seen_at      timestamptz NOT NULL DEFAULT now(),
  last_seen_at       timestamptz NOT NULL DEFAULT now(),
  scan_count         integer     NOT NULL DEFAULT 0,
  promoted_user_id   uuid        NULL,
  promoted_at        timestamptz NULL,
  blocked_at         timestamptz NULL,
  blocked_reason     text        NULL,
  user_agent_hash    char(64)    NULL,
  ip_hash            char(64)    NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NULL,
  deleted_at         timestamptz NULL,

  CONSTRAINT pk_guest_session
    PRIMARY KEY (id),

  CONSTRAINT fk_guest_session_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenant (id),

  CONSTRAINT fk_guest_session_promoted_user
    FOREIGN KEY (promoted_user_id) REFERENCES app_user (id),

  CONSTRAINT ck_guest_session_client_token_hash_format
    CHECK (client_token_hash ~ '^[0-9a-f]{64}$'),

  CONSTRAINT ck_guest_session_author_token_format
    CHECK (author_token ~ '^[0-9A-Z]{32}$'),

  CONSTRAINT ck_guest_session_scan_count_non_negative
    CHECK (scan_count >= 0),

  CONSTRAINT ck_guest_session_last_seen_after_first
    CHECK (last_seen_at >= first_seen_at),

  CONSTRAINT ck_guest_session_promotion_consistent
    CHECK ((promoted_user_id IS NULL) = (promoted_at IS NULL)),

  CONSTRAINT ck_guest_session_blocked_reason_requires_block
    CHECK (blocked_reason IS NULL OR blocked_at IS NOT NULL),

  CONSTRAINT ck_guest_session_hash_formats
    CHECK (
      (user_agent_hash IS NULL OR user_agent_hash ~ '^[0-9a-f]{64}$')
      AND (ip_hash IS NULL OR ip_hash ~ '^[0-9a-f]{64}$')
    )
);

-- Composite key target so behaviour_signal / pulse_session can reference
-- a guest session with tenant agreement enforced.
ALTER TABLE guest_session
  ADD CONSTRAINT uq_guest_session_id_tenant UNIQUE (id, tenant_id);

-- The cookie value itself is never stored; only its SHA-256. Unique per
-- tenant because the guest cookie is tenant-scoped (Architecture Sec 3.4
-- step 2) -- one device scanning a Community QR and a Corporate QR holds
-- two independent guest identities and two independent pseudonyms.
CREATE UNIQUE INDEX uq_guest_session_tenant_client_token_hash
  ON guest_session (tenant_id, client_token_hash);

CREATE UNIQUE INDEX uq_guest_session_tenant_author_token
  ON guest_session (tenant_id, author_token);

CREATE INDEX idx_guest_session_promoted_user
  ON guest_session (promoted_user_id)
  WHERE promoted_user_id IS NOT NULL;

-- Reaper / anonymous engagement rollups.
CREATE INDEX idx_guest_session_tenant_last_seen_at
  ON guest_session (tenant_id, last_seen_at DESC)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_guest_session_updated_at
  BEFORE UPDATE ON guest_session
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE guest_session IS
  'Unauthenticated QR journeys (WRK-003 MUST). A guest is a first-class actor: it carries its own author_token so guest activity is countable, rate-limitable and blockable exactly like a member''s, and so read state / views / scans need no user_id column at all. Almost always the Community tenant, but a Corporate QR scan by a passer-by also lands here (Architecture Sec 3.6).';
COMMENT ON COLUMN guest_session.client_token_hash IS
  'SHA-256 (lowercase hex) of the opaque signed HttpOnly cookie value held by the PWA. The raw cookie value is NEVER stored, so a database dump cannot be replayed as a guest session.';
COMMENT ON COLUMN guest_session.author_token IS
  'Same shape and same role as user_tenant_membership.author_token. Not derived from a user_id (there is none): minted as 20 random bytes at session creation, base32-encoded. Unique per tenant, so every downstream table can key on author_token alone.';
COMMENT ON COLUMN guest_session.scan_count IS
  'Anonymous engagement metric -- QR scans are a named Phase 1 success measure. Incremented by the QR resolve path; not an audit trail.';
COMMENT ON COLUMN guest_session.promoted_user_id IS
  'Set when a guest registers, so their prior guest activity attaches to the new account WITHOUT re-keying any signal, view, scan or read-state row (those stay keyed on this session''s author_token). This is the single deliberate exception to the "no user_id on guest-keyed tables" rule: it lives here, on the session, and never on an activity row.';
COMMENT ON COLUMN guest_session.blocked_at IS
  'Guest abuse blocking. Blocking a guest blocks a token and a device cookie, never a person -- there is no person to know.';
COMMENT ON COLUMN guest_session.ip_hash IS
  'Salted SHA-256, never a raw address (GDPR data minimisation). Rate-limit correlation only.';
COMMENT ON COLUMN guest_session.user_agent_hash IS
  'Salted SHA-256 of the user agent string. Coarse device fingerprint for abuse handling; never rendered to any user.';


-- =====================================================================
-- 5. auth_token -- magic link, email OTP, invitation, password reset
-- =====================================================================
-- One table for all four kinds. They share every operational concern
-- (hash-only storage, TTL, single use, attempt throttling, reaping); four
-- near-identical tables would mean four reapers and four sets of bugs.
--
-- NOT RLS-scoped, deliberately: a magic-link or OTP request arrives
-- BEFORE any tenant context exists (the requester is unauthenticated and
-- may belong to several tenants), so current_setting('app.tenant_id') is
-- unset and any tenant policy would reject the INSERT. It is protected
-- instead by: hash-only storage, short TTLs, single use (consumed_at),
-- attempt_count throttling, and the fact that safein5_app can only ever
-- look a row up by exact token_hash equality -- a value it cannot compute
-- without the token the user is holding.
-- =====================================================================
CREATE TABLE auth_token (
  id             uuid        NOT NULL DEFAULT gen_random_uuid(),
  kind           text        NOT NULL,
  token_hash     char(64)    NOT NULL,
  user_id        uuid        NULL,
  email          citext      NULL,
  tenant_id      uuid        NULL,
  role_id        uuid        NULL,
  expires_at     timestamptz NOT NULL,
  consumed_at    timestamptz NULL,
  attempt_count  integer     NOT NULL DEFAULT 0,
  max_attempts   integer     NOT NULL DEFAULT 5,
  ip_hash        char(64)    NULL,
  created_by_membership_id uuid NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NULL,
  deleted_at     timestamptz NULL,

  CONSTRAINT pk_auth_token
    PRIMARY KEY (id),

  CONSTRAINT fk_auth_token_user
    FOREIGN KEY (user_id) REFERENCES app_user (id),

  CONSTRAINT fk_auth_token_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenant (id),

  CONSTRAINT fk_auth_token_role
    FOREIGN KEY (role_id) REFERENCES role (id),

  -- ON DELETE SET NULL: an outstanding invitation must not make the
  -- inviting admin's membership undeletable at GDPR erasure time.
  CONSTRAINT fk_auth_token_created_by
    FOREIGN KEY (created_by_membership_id) REFERENCES user_tenant_membership (id)
    ON DELETE SET NULL,

  CONSTRAINT ck_auth_token_kind
    CHECK (kind IN ('magic_link', 'otp', 'invitation', 'password_reset')),

  CONSTRAINT ck_auth_token_hash_format
    CHECK (token_hash ~ '^[0-9a-f]{64}$'),

  -- Every token must address SOMETHING. An invitation may name only an
  -- email (the invitee has no account yet); a password reset always names
  -- an existing user.
  CONSTRAINT ck_auth_token_has_target
    CHECK (user_id IS NOT NULL OR email IS NOT NULL),

  -- An invitation is inherently an invitation INTO a tenant with a role
  -- (ADM-026). Without both, acceptance has nothing to create.
  CONSTRAINT ck_auth_token_invitation_requires_tenant_and_role
    CHECK (kind <> 'invitation' OR (tenant_id IS NOT NULL AND role_id IS NOT NULL)),

  CONSTRAINT ck_auth_token_password_reset_requires_user
    CHECK (kind <> 'password_reset' OR user_id IS NOT NULL),

  CONSTRAINT ck_auth_token_attempts_non_negative
    CHECK (attempt_count >= 0 AND max_attempts > 0),

  CONSTRAINT ck_auth_token_expires_after_created
    CHECK (expires_at > created_at),

  CONSTRAINT ck_auth_token_ip_hash_format
    CHECK (ip_hash IS NULL OR ip_hash ~ '^[0-9a-f]{64}$')
);

-- The token itself is looked up by hash equality; globally unique so a
-- hash collision or a replayed link cannot resolve to two rows.
CREATE UNIQUE INDEX uq_auth_token_token_hash
  ON auth_token (token_hash);

-- At most ONE live (unconsumed) token of a given kind per target.
-- Two indexes because the target is either a user_id or a bare email.
--
-- NOTE on "live": the predicate tests consumed_at IS NULL only. It cannot
-- test expires_at > now() because now() is not IMMUTABLE and is illegal in
-- an index predicate. The Identity module therefore marks superseded
-- tokens consumed when it issues a replacement -- which is the behaviour
-- we want anyway: requesting a new OTP must invalidate the previous one.
CREATE UNIQUE INDEX uq_auth_token_live_per_user_kind
  ON auth_token (kind, user_id, coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE consumed_at IS NULL AND user_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX uq_auth_token_live_per_email_kind
  ON auth_token (kind, email, coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE consumed_at IS NULL AND user_id IS NULL AND email IS NOT NULL AND deleted_at IS NULL;

-- Reaper: expire sweep and "resend invitation" admin screens.
CREATE INDEX idx_auth_token_expires_at
  ON auth_token (expires_at)
  WHERE consumed_at IS NULL;

CREATE INDEX idx_auth_token_tenant_kind
  ON auth_token (tenant_id, kind)
  WHERE tenant_id IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER trg_auth_token_updated_at
  BEFORE UPDATE ON auth_token
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE auth_token IS
  'Single-use credentials for magic link, email OTP, admin invitation (ADM-026) and admin password reset (ADM-003). Stores a HASH only -- never the token. Not RLS-scoped because these rows are created before any tenant context exists; see the block comment above the table for what protects them instead.';
COMMENT ON COLUMN auth_token.kind IS
  'magic_link | otp | invitation | password_reset. text + CHECK, never a PG ENUM. Different TTLs per kind are an application policy (OTP ~10 min, magic link ~15 min, invitation ~7 days), not a DB constraint.';
COMMENT ON COLUMN auth_token.token_hash IS
  'SHA-256 (lowercase hex) of the emailed token or OTP code, salted with the same KMS pepper family as author_token. The plaintext token exists only in the email and in the request that redeems it. A stolen database grants no logins.';
COMMENT ON COLUMN auth_token.user_id IS
  'NULL for an invitation to an email address that has no app_user row yet -- acceptance creates the user and the membership in one transaction.';
COMMENT ON COLUMN auth_token.email IS
  'The address the token was sent to, recorded even when user_id is set, so a later email change cannot silently re-target a live token.';
COMMENT ON COLUMN auth_token.tenant_id IS
  'Required for invitations (which tenant the invitee is joining); NULL for magic link / OTP / password reset, where the tenant is only known after the user is identified and their memberships are read.';
COMMENT ON COLUMN auth_token.role_id IS
  'Invitations only: the role the accepted membership will be created with (ADM-026 role assignment).';
COMMENT ON COLUMN auth_token.consumed_at IS
  'Single use. Also set when a token is SUPERSEDED by a newly issued one of the same kind for the same target -- which is what makes uq_auth_token_live_* enforceable without a now() predicate.';
COMMENT ON COLUMN auth_token.attempt_count IS
  'Failed redemption attempts. Guards OTP brute force: the Identity module rejects once attempt_count >= max_attempts and consumes the row.';
COMMENT ON COLUMN auth_token.ip_hash IS
  'Salted SHA-256 of the requesting address, never raw (GDPR minimisation). Abuse correlation only.';
COMMENT ON COLUMN auth_token.deleted_at IS
  'Soft delete for administrative revocation of an outstanding invitation. Expired/consumed rows are pruned by the retention job, not by user action.';


-- =====================================================================
-- 6. tenant_secret -- per-tenant salt for author_token derivation
-- =====================================================================
-- Architecture Sec 4.2:
--
--   pepper       = 32-byte secret held in KMS / Secrets Manager.
--                  NEVER in this database, never in git.
--   tenant_salt  = 16 random bytes per tenant -- THIS TABLE.
--   author_token = base32(
--                    HMAC-SHA256(pepper, tenant_salt || ':' || user_id)
--                  [0..19])                              -- 32 characters
--
-- Properties this split buys:
--   * Deterministic  -- same user + same tenant = same token forever, so
--                       repeat usage (the primary success measure) is
--                       countable across anonymous signals.
--   * Per-tenant     -- the same person is a DIFFERENT pseudonym in
--                       Community and in their employer's tenant.
--   * One-way        -- no token -> user_id computation exists.
--   * Dump-resistant -- a stolen database contains the salt but not the
--                       pepper, so the mapping cannot be brute-forced.
--
-- One row per tenant, PK = tenant_id (no surrogate key: a second salt row
-- for one tenant would silently fork every pseudonym in it).
-- =====================================================================
CREATE TABLE tenant_secret (
  tenant_id           uuid        NOT NULL,
  author_token_salt   bytea       NOT NULL,
  salt_version        integer     NOT NULL DEFAULT 1,
  pepper_key_ref      text        NULL,
  rotated_at          timestamptz NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NULL,
  deleted_at          timestamptz NULL,

  CONSTRAINT pk_tenant_secret
    PRIMARY KEY (tenant_id),

  CONSTRAINT fk_tenant_secret_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenant (id),

  CONSTRAINT ck_tenant_secret_salt_length
    CHECK (octet_length(author_token_salt) = 16),

  CONSTRAINT ck_tenant_secret_salt_version_positive
    CHECK (salt_version > 0)
);

CREATE TRIGGER trg_tenant_secret_updated_at
  BEFORE UPDATE ON tenant_secret
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE tenant_secret IS
  'Per-tenant 16-byte salt used to derive author_token: base32(HMAC-SHA256(kms_pepper, author_token_salt || '':'' || user_id)[0..19]) (Architecture Sec 4.2). One row per tenant, PK = tenant_id. The KMS pepper is NEVER stored here or anywhere in this database. SELECT is granted only to safein5_identity (0007).';
COMMENT ON COLUMN tenant_secret.author_token_salt IS
  '16 CSPRNG bytes, generated once at tenant creation and never rotated in normal operation -- rotating it would fork every existing pseudonym in the tenant and destroy repeat-usage continuity. See salt_version / rotated_at for the escape hatch.';
COMMENT ON COLUMN tenant_secret.salt_version IS
  'Incremented only if a salt must be rotated after a suspected compromise. Bumping it deliberately invalidates every historical author_token in the tenant; the migration that does it must also decide what happens to existing signals.';
COMMENT ON COLUMN tenant_secret.pepper_key_ref IS
  'Opaque KMS key identifier (ARN / key name) naming WHICH pepper was used -- never the pepper itself. Lets the pepper be rotated in KMS without losing the ability to reproduce historical tokens.';
COMMENT ON COLUMN tenant_secret.deleted_at IS
  'Soft delete. NOTE: tenant-level erasure is one of the very few operations permitted to hard-DELETE a row in SafeIn5 -- destroying the salt is what makes an entire tenant''s pseudonyms permanently unresolvable. Routine deactivation soft-deletes.';


-- =====================================================================
-- 7. Row-Level Security
-- =====================================================================
-- Architecture Sec 3.3. Every tenant-scoped table in this migration gets
-- ENABLE + FORCE, a USING clause with the app.bypass_rls escape for the
-- cross-tenant background worker, and a WITH CHECK clause with NO bypass.
--
-- app_user and auth_token are intentionally absent: both are global /
-- pre-tenant. See the block comments above those tables.
-- =====================================================================

ALTER TABLE user_tenant_membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenant_membership FORCE  ROW LEVEL SECURITY;

CREATE POLICY pol_tenant_isolation_user_tenant_membership
  ON user_tenant_membership
  USING (
       current_setting('app.bypass_rls', true) = 'on'
    OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );

COMMENT ON POLICY pol_tenant_isolation_user_tenant_membership ON user_tenant_membership IS
  'Tenant isolation. USING allows the background worker via app.bypass_rls; WITH CHECK deliberately does not, so no code path can write a membership into another tenant.';

ALTER TABLE user_site_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_site_assignment FORCE  ROW LEVEL SECURITY;

CREATE POLICY pol_tenant_isolation_user_site_assignment
  ON user_site_assignment
  USING (
       current_setting('app.bypass_rls', true) = 'on'
    OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );

COMMENT ON POLICY pol_tenant_isolation_user_site_assignment ON user_site_assignment IS
  'Tenant isolation. Site-level scoping (which supervisor sees which site) is an application concern layered on top; RLS guarantees only that no assignment crosses a tenant boundary.';

ALTER TABLE guest_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_session FORCE  ROW LEVEL SECURITY;

CREATE POLICY pol_tenant_isolation_guest_session
  ON guest_session
  USING (
       current_setting('app.bypass_rls', true) = 'on'
    OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );

COMMENT ON POLICY pol_tenant_isolation_guest_session ON guest_session IS
  'Tenant isolation. The unauthenticated QR resolve path still runs inside a transaction with app.tenant_id set from qr_code.tenant_id (Architecture Sec 6.2), so guest rows are created under a real tenant context, never a bypass.';

ALTER TABLE tenant_secret ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_secret FORCE  ROW LEVEL SECURITY;

CREATE POLICY pol_tenant_isolation_tenant_secret
  ON tenant_secret
  USING (
       current_setting('app.bypass_rls', true) = 'on'
    OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );

COMMENT ON POLICY pol_tenant_isolation_tenant_secret ON tenant_secret IS
  'Tenant isolation, in addition to the table-level grant that limits access to safein5_identity. Two independent controls because reading another tenant''s salt is the single highest-value privilege escalation in the system.';

-- =====================================================================
-- End of migration 0002. Roles and grants: see 0007_rls_roles.sql.
-- =====================================================================
