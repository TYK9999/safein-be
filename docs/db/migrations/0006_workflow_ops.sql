-- =====================================================================
-- SafeIn5 MVP -- Migration 0006: WORKFLOW & OPS
-- Workflow state machine (config-as-data), review tasks, transition log,
-- evidence, moderation, audit log, device subscriptions, notifications,
-- transactional outbox.
--
-- Source of truth: SafeIn5-MVP-Architecture.md Sec 2.6, 2.7, 2.8, 3, 4, 8.
--
-- Depends on 0001 (tenant), 0002 (app_user, user_tenant_membership) and
-- 0005 (behaviour_signal).
--
-- Conventions (restated so this file is readable standalone):
--   * Enumerations are text + named CHECK, never PG ENUM.
--   * Every tenant-scoped table: tenant_id NOT NULL, RLS ENABLED and
--     FORCED, policy keyed on nullif(current_setting('app.tenant_id', true), '')::uuid
--     with an app.bypass_rls escape on USING only.
--   * Soft delete only (deleted_at). Nothing is ever hard deleted except
--     whole audit partitions at end of retention.
--   * Append-only tables get no UPDATE/DELETE grant to any runtime role
--     (enforced in 0007).
--   * Plain ASCII only.
-- =====================================================================


-- =====================================================================
-- SECTION 1. WORKFLOW STATE MACHINE AS CONFIG DATA
-- =====================================================================
--
-- DESIGN DECISION -- documented conflict between two authoritative docs.
--
--   Dev Pack Sec 7 specifies the corporate workflow lifecycle as:
--       New -> Assigned -> Acknowledged -> Actioned -> Closed
--     with the rules "assignment required before action" and
--     "evidence required before close (configurable)".
--
--   PRD Sec 5.4 cuts the MVP supervisor workflow down to two actions:
--       Acknowledge + Close. No assignment screen, no evidence UI.
--
-- These cannot both be implemented in the MVP window, and picking one at
-- the code level would make the other a schema migration mid-pilot. So
-- the state machine is not a PG enum and not an application constant --
-- it is two seeded config tables. The FULL Dev Pack lifecycle is seeded
-- now; only the PRD Sec 5.4 subset carries enabled_in_mvp = true.
-- Turning on the full lifecycle in Phase 2 is an UPDATE against seed data
-- plus UI work -- no ALTER TYPE, no migration on a table that by then
-- holds live pilot review tasks.
--
-- Naming note: Dev Pack's initial state "New" is seeded under the code
-- 'open', which is the name the architecture doc (Sec 2.6) and the feed
-- badge (behaviour_signal.workflow_state) already use. One state, one
-- code; the label carries both words. Seeding a separate 'new' row would
-- create two codes meaning the same thing.
-- =====================================================================

CREATE TABLE workflow_state_def (
    code              text        NOT NULL,
    label             text        NOT NULL,
    sort_order        integer     NOT NULL,
    is_terminal       boolean     NOT NULL DEFAULT false,
    requires_evidence boolean     NOT NULL DEFAULT false,
    enabled_in_mvp    boolean     NOT NULL DEFAULT false,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz,

    CONSTRAINT pk_workflow_state_def PRIMARY KEY (code),
    CONSTRAINT uq_workflow_state_def_sort_order UNIQUE (sort_order),
    CONSTRAINT ck_workflow_state_def_code
        CHECK (code ~ '^[a-z][a-z0-9_]{1,31}$')
);

COMMENT ON TABLE  workflow_state_def IS
    'Config-as-data definition of the review-task state machine states. Global reference table, NOT tenant-scoped: the lifecycle is a product decision, not a per-customer setting, at MVP. Seeded with the full Dev Pack Sec 7 lifecycle; enabled_in_mvp gates the PRD Sec 5.4 subset.';
COMMENT ON COLUMN workflow_state_def.code IS
    'Stable machine code. review_task.state FKs to this, which is why states are a table lookup rather than a PG enum (Phase 2 = INSERT, not ALTER TYPE).';
COMMENT ON COLUMN workflow_state_def.is_terminal IS
    'No outbound enabled transitions expected. Used by the metrics projector to stop the time_to_close clock.';
COMMENT ON COLUMN workflow_state_def.requires_evidence IS
    'Dev Pack Sec 7 "evidence required before close (configurable)". Configurable is exactly this column. False at MVP because PRD Sec 5.4 ships no evidence UI -- see the evidence table below.';
COMMENT ON COLUMN workflow_state_def.enabled_in_mvp IS
    'False for the Dev Pack states the MVP does not implement (assigned, actioned). The API transition guard rejects any target state where this is false, so Phase 2 enablement is a seed change plus UI, not a migration.';

CREATE TABLE workflow_transition_def (
    id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
    from_code           text        NOT NULL,
    to_code             text        NOT NULL,
    required_permission text        NOT NULL,
    enabled             boolean     NOT NULL DEFAULT false,
    note                text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz,

    CONSTRAINT pk_workflow_transition_def PRIMARY KEY (id),
    CONSTRAINT uq_workflow_transition_def_pair UNIQUE (from_code, to_code),
    CONSTRAINT ck_workflow_transition_def_not_self CHECK (from_code <> to_code),
    CONSTRAINT fk_workflow_transition_def_from
        FOREIGN KEY (from_code) REFERENCES workflow_state_def (code),
    CONSTRAINT fk_workflow_transition_def_to
        FOREIGN KEY (to_code)   REFERENCES workflow_state_def (code)
);

COMMENT ON TABLE  workflow_transition_def IS
    'Config-as-data edge list of the review-task state machine. The application transition guard is a single lookup against this table: a transition that is absent or enabled=false is a 409, regardless of caller role.';
COMMENT ON COLUMN workflow_transition_def.required_permission IS
    'Flat permission string checked against role.permissions jsonb (no RBAC engine at MVP -- set membership only). Values match the strings seeded into role.permissions in migration 0001.';
COMMENT ON COLUMN workflow_transition_def.enabled IS
    'The single switch separating PRD Sec 5.4 (MVP) from Dev Pack Sec 7 (Phase 2).';

-- --- Seed: states -----------------------------------------------------
INSERT INTO workflow_state_def
    (code, label, sort_order, is_terminal, requires_evidence, enabled_in_mvp)
VALUES
    ('open',         'New / Open',   10, false, false, true),
    ('assigned',     'Assigned',     20, false, false, false),
    ('acknowledged', 'Acknowledged', 30, false, false, true),
    ('actioned',     'Actioned',     40, false, false, false),
    ('closed',       'Closed',       50, true,  false, true);

-- --- Seed: transitions ------------------------------------------------
-- MVP path (enabled):    open -> acknowledged -> closed
-- Phase 2 path (seeded, disabled): the full Dev Pack chain plus reopen.
--
-- open -> closed is deliberately seeded DISABLED: PRD Sec 5.4's two-tap
-- flow exists so that "supervisor saw it" and "supervisor resolved it"
-- are separate timestamps. Collapsing them would silently destroy
-- first_response_ms, which is the metric the whole "report black hole"
-- argument rests on (Dev Pack Sec 17.1 Scenario 5). Enabling it later is
-- an UPDATE of one row.
INSERT INTO workflow_transition_def
    (from_code, to_code, required_permission, enabled, note)
VALUES
    ('open',         'acknowledged', 'workflow.acknowledge', true,
        'MVP. Stamps acknowledged_at + first_response_ms.'),
    ('acknowledged', 'closed',       'workflow.close',       true,
        'MVP. Stamps closed_at + time_to_close_ms; closure_note is publicly displayed (PRD Sec 5.5).'),
    ('open',         'closed',       'workflow.close',       false,
        'Deliberately disabled at MVP -- would destroy first_response_ms.'),
    ('open',         'assigned',     'workflow.assign',      false,
        'Phase 2 (Dev Pack Sec 7 "assignment required before action").'),
    ('assigned',     'acknowledged', 'workflow.acknowledge', false, 'Phase 2.'),
    ('acknowledged', 'actioned',     'workflow.action',      false, 'Phase 2.'),
    ('actioned',     'closed',       'workflow.close',       false,
        'Phase 2. Set workflow_state_def.requires_evidence = true on closed to enforce Dev Pack Sec 7 evidence-before-close.'),
    ('closed',       'open',         'workflow.reopen',      false,
        'Phase 2 reopen. Seeded now so the audit trail shape is settled before pilot data exists.');


-- =====================================================================
-- SECTION 2. REVIEW TASK
-- =====================================================================
--
-- MEMBERSHIP REFERENCES ARE SINGLE-COLUMN, NOT COMPOSITE, EVERYWHERE IN
-- THIS FILE. Every other cross-table reference in the schema uses a
-- composite (id, tenant_id) FK for cross-tenant safety, but these four
-- columns need ON DELETE SET NULL: GDPR erasure (Architecture Sec 4.4
-- step 2) DELETEs user_tenant_membership rows to destroy the pseudonym
-- mapping, and supervisor attribution must degrade to NULL rather than
-- block the erasure or cascade away the task itself. A composite
-- ON DELETE SET NULL would also null tenant_id, which is NOT NULL, and
-- the statement would fail at erasure time. Tenant agreement for these
-- columns is therefore enforced by the application plus RLS.

CREATE TABLE review_task (
    id                            uuid        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id                     uuid        NOT NULL,
    signal_id                     uuid        NOT NULL,
    state                         text        NOT NULL DEFAULT 'open',
    assigned_to_membership_id     uuid,
    assigned_at                   timestamptz,
    acknowledged_at               timestamptz,
    acknowledged_by_membership_id uuid,
    closed_at                     timestamptz,
    closed_by_membership_id       uuid,
    closure_note                  text,
    due_at                        timestamptz,
    first_response_ms             bigint,
    time_to_close_ms              bigint,
    created_at                    timestamptz NOT NULL DEFAULT now(),
    updated_at                    timestamptz,
    deleted_at                    timestamptz,

    CONSTRAINT pk_review_task PRIMARY KEY (id),
    CONSTRAINT uq_review_task_signal UNIQUE (signal_id),
    CONSTRAINT fk_review_task_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenant (id),
    CONSTRAINT fk_review_task_signal
        FOREIGN KEY (signal_id, tenant_id) REFERENCES behaviour_signal (id, tenant_id),
    CONSTRAINT fk_review_task_state
        FOREIGN KEY (state) REFERENCES workflow_state_def (code),
    CONSTRAINT fk_review_task_assigned_to
        FOREIGN KEY (assigned_to_membership_id)
        REFERENCES user_tenant_membership (id) ON DELETE SET NULL,
    CONSTRAINT fk_review_task_acknowledged_by
        FOREIGN KEY (acknowledged_by_membership_id)
        REFERENCES user_tenant_membership (id) ON DELETE SET NULL,
    CONSTRAINT fk_review_task_closed_by
        FOREIGN KEY (closed_by_membership_id)
        REFERENCES user_tenant_membership (id) ON DELETE SET NULL,
    CONSTRAINT ck_review_task_closed_state
        CHECK (state <> 'closed' OR closed_at IS NOT NULL),
    CONSTRAINT ck_review_task_ack_timestamps
        CHECK (acknowledged_by_membership_id IS NULL OR acknowledged_at IS NOT NULL),
    CONSTRAINT ck_review_task_close_timestamps
        CHECK (closed_by_membership_id IS NULL OR closed_at IS NOT NULL),
    CONSTRAINT ck_review_task_assigned_timestamps
        CHECK (assigned_to_membership_id IS NULL OR assigned_at IS NOT NULL),
    CONSTRAINT ck_review_task_durations_non_negative
        CHECK (COALESCE(first_response_ms, 0) >= 0 AND COALESCE(time_to_close_ms, 0) >= 0)
);

ALTER TABLE review_task
    ADD CONSTRAINT uq_review_task_id_tenant UNIQUE (id, tenant_id);

COMMENT ON TABLE  review_task IS
    'One supervisor review task per behaviour_signal. Created by the outbox consumer WorkflowTaskCreator when classification.triggers_workflow is true (needs_attention_now), or on manual supervisor pickup. At most one per signal (uq_review_task_signal) so the feed badge join stays a 1:0..1.';
COMMENT ON COLUMN review_task.state IS
    'Text FK to workflow_state_def.code -- deliberately not a PG enum. MVP values: open | acknowledged | closed.';
COMMENT ON COLUMN review_task.assigned_to_membership_id IS
    'Phase-2 structure (Dev Pack Sec 7 assignment step). Written at MVP only if a supervisor self-assigns; there is no assignment UI (PRD Sec 5.4). Column exists now so the Phase-2 lifecycle needs no migration against live pilot rows. ON DELETE SET NULL so GDPR erasure of a supervisor membership cannot block.';
COMMENT ON COLUMN review_task.closure_note IS
    'Publicly displayed on the signal card (PRD Sec 5.5) -- this is the "you were heard" loop that closes the report black hole. Treat as worker-visible text: no names, no PII; the moderation serialiser allowlist applies.';
COMMENT ON COLUMN review_task.due_at IS
    '[SIGNAL] Response-time SLA target. No MVP feature reads it; it is written so SLA breach analysis is possible retrospectively (Dev Pack Sec 17.1 Scenario 5).';
COMMENT ON COLUMN review_task.first_response_ms IS
    '[SIGNAL] Milliseconds from signal finalisation to first supervisor acknowledgement. Together with time_to_close_ms this IS the "report black hole" metric: the pilot claim is that SafeIn5 turns unanswered reports into answered ones, and these two columns are the only evidence that will exist for it. Materialised at transition time, never computed on read, because review_task rows are mutable and the source timestamps can be corrected.';
COMMENT ON COLUMN review_task.time_to_close_ms IS
    '[SIGNAL] Milliseconds from signal finalisation to closure. See first_response_ms.';
COMMENT ON COLUMN review_task.deleted_at IS
    'Soft delete (tombstone). Review tasks are never hard deleted -- the workflow_transition log would otherwise reference a vanished aggregate.';

CREATE INDEX idx_review_task_tenant_state_created
    ON review_task (tenant_id, state, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_review_task_tenant_due
    ON review_task (tenant_id, due_at)
    WHERE deleted_at IS NULL AND closed_at IS NULL;

CREATE INDEX idx_review_task_assigned_to
    ON review_task (assigned_to_membership_id, state)
    WHERE deleted_at IS NULL AND assigned_to_membership_id IS NOT NULL;


-- =====================================================================
-- SECTION 3. WORKFLOW TRANSITION LOG (APPEND-ONLY)
-- =====================================================================

CREATE TABLE workflow_transition (
    id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id           uuid        NOT NULL,
    review_task_id      uuid        NOT NULL,
    from_state          text,
    to_state            text        NOT NULL,
    actor_membership_id uuid,
    actor_role          text,
    note                text,
    created_at          timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT pk_workflow_transition PRIMARY KEY (id),
    CONSTRAINT fk_workflow_transition_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenant (id),
    CONSTRAINT fk_workflow_transition_task
        FOREIGN KEY (review_task_id, tenant_id) REFERENCES review_task (id, tenant_id),
    CONSTRAINT fk_workflow_transition_from_state
        FOREIGN KEY (from_state) REFERENCES workflow_state_def (code),
    CONSTRAINT fk_workflow_transition_to_state
        FOREIGN KEY (to_state)   REFERENCES workflow_state_def (code),
    CONSTRAINT fk_workflow_transition_actor
        FOREIGN KEY (actor_membership_id)
        REFERENCES user_tenant_membership (id) ON DELETE SET NULL,
    CONSTRAINT ck_workflow_transition_not_self
        CHECK (from_state IS DISTINCT FROM to_state)
);

COMMENT ON TABLE  workflow_transition IS
    'APPEND-ONLY event log of every review_task state change. Directly satisfies Dev Pack Sec 7 rule "each state change logged". No UPDATE/DELETE grant to any runtime role (0007) -- correcting a transition means appending a compensating one. There is no updated_at column by design.';
COMMENT ON COLUMN workflow_transition.from_state IS
    'NULL for the creation transition (nothing -> open).';
COMMENT ON COLUMN workflow_transition.actor_membership_id IS
    'Supervisor/admin actions are never anonymous, so a membership id is correct here (contrast audit_log.actor_token, which masks anonymous authors). NULL when the actor is the system (outbox consumer creating the task) or when the membership has since been erased.';
COMMENT ON COLUMN workflow_transition.actor_role IS
    'Role code snapshotted at transition time. Denormalised deliberately: a membership role can change, but who-did-what-under-which-role must not.';

CREATE INDEX idx_workflow_transition_task_created
    ON workflow_transition (review_task_id, created_at);
CREATE INDEX idx_workflow_transition_tenant_created
    ON workflow_transition (tenant_id, created_at DESC);


-- =====================================================================
-- SECTION 4. EVIDENCE
-- =====================================================================
--
-- DESIGN DECISION: the table ships at MVP, the UI does not (PRD Sec 5.4
-- defers the evidence-before-close step from Dev Pack Sec 7). Two days of
-- schema now versus a migration mid-pilot against a live supervisor
-- workflow with real review tasks in flight. The API can write evidence
-- rows from day one if a closure attaches a photo; nothing reads them
-- until Phase 2 turns on workflow_state_def.requires_evidence.

CREATE TABLE evidence (
    id                        uuid        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id                 uuid        NOT NULL,
    review_task_id            uuid        NOT NULL,
    kind                      text        NOT NULL,
    storage_key               text,
    note                      text,
    mime_type                 text,
    byte_size                 bigint,
    checksum_sha256           char(64),
    uploaded_by_membership_id uuid,
    created_at                timestamptz NOT NULL DEFAULT now(),
    updated_at                timestamptz,
    deleted_at                timestamptz,

    CONSTRAINT pk_evidence PRIMARY KEY (id),
    CONSTRAINT fk_evidence_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenant (id),
    CONSTRAINT fk_evidence_task
        FOREIGN KEY (review_task_id, tenant_id) REFERENCES review_task (id, tenant_id),
    CONSTRAINT fk_evidence_uploaded_by
        FOREIGN KEY (uploaded_by_membership_id)
        REFERENCES user_tenant_membership (id) ON DELETE SET NULL,
    CONSTRAINT ck_evidence_kind
        CHECK (kind IN ('photo', 'note', 'document')),
    -- A note carries text; a photo/document carries an object key.
    -- Enforced so a Phase-2 "evidence required before close" rule cannot
    -- be satisfied by an empty row.
    CONSTRAINT ck_evidence_payload_present
        CHECK ((kind = 'note'  AND note IS NOT NULL)
            OR (kind <> 'note' AND storage_key IS NOT NULL)),
    CONSTRAINT ck_evidence_byte_size CHECK (byte_size IS NULL OR byte_size > 0),
    CONSTRAINT ck_evidence_checksum
        CHECK (checksum_sha256 IS NULL OR checksum_sha256 ~ '^[0-9a-f]{64}$')
);

COMMENT ON TABLE  evidence IS
    'Supporting evidence attached to a review task (Dev Pack Sec 7 object "Evidence"). SCHEMA EXISTS AT MVP, UI DOES NOT (PRD Sec 5.4 defers it).';
COMMENT ON COLUMN evidence.storage_key IS
    'Object-store key, tenant-prefixed exactly as signal_media (s3://bucket/{tenant_id}/...) so a per-tenant lifecycle or deletion policy covers evidence too.';
COMMENT ON COLUMN evidence.uploaded_by_membership_id IS
    'Evidence is a supervisor artefact and is never anonymous. Nulled by GDPR erasure of that membership rather than cascading.';

CREATE INDEX idx_evidence_task ON evidence (review_task_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_evidence_tenant_created ON evidence (tenant_id, created_at DESC)
    WHERE deleted_at IS NULL;


-- =====================================================================
-- SECTION 5. MODERATION ACTION
-- =====================================================================

CREATE TABLE moderation_action (
    id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id           uuid        NOT NULL,
    target_type         text        NOT NULL,
    target_id           uuid        NOT NULL,
    action              text        NOT NULL,
    reason_code         text,
    note                text,
    actor_membership_id uuid,
    actor_role          text,
    previous_value      jsonb,
    new_value           jsonb,
    created_at          timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT pk_moderation_action PRIMARY KEY (id),
    CONSTRAINT fk_moderation_action_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenant (id),
    CONSTRAINT fk_moderation_action_actor
        FOREIGN KEY (actor_membership_id)
        REFERENCES user_tenant_membership (id) ON DELETE SET NULL,
    CONSTRAINT ck_moderation_action_target_type
        CHECK (target_type IN ('signal', 'media', 'user', 'comment')),
    CONSTRAINT ck_moderation_action_action
        CHECK (action IN ('hide', 'unhide', 'remove', 'edit_caption',
                          'edit_classification', 'block_author', 'mark_duplicate')),
    -- An edit that does not record what it replaced is a destructive edit.
    CONSTRAINT ck_moderation_action_edits_carry_previous
        CHECK (action NOT IN ('edit_caption', 'edit_classification')
               OR previous_value IS NOT NULL)
);

COMMENT ON TABLE  moderation_action IS
    'Polymorphic moderation/admin action log (Architecture Sec 2.6). Semantically append-only: SELECT + INSERT only to runtime roles, no UPDATE/DELETE. Reversing a hide is a new unhide row, not an edit.';
COMMENT ON COLUMN moderation_action.target_type IS
    'Polymorphic discriminator: signal | media | user | comment. No FK by design -- four nullable FK columns and four partial indexes for a table read only by the admin console is not worth it. "comment" is seeded in the CHECK although comments do not exist at MVP, so Phase 2 comment moderation is not an ALTER.';
COMMENT ON COLUMN moderation_action.target_id IS
    'Id of the target row in the table named by target_type. uuid for all four target types at MVP.';
COMMENT ON COLUMN moderation_action.reason_code IS
    'Short vocabulary held in application config, not a table, at MVP: off_topic | abusive | personal_data | duplicate | incorrect_classification | test_content | other. Free text so a moderator is never blocked from acting by a missing code.';
COMMENT ON COLUMN moderation_action.actor_membership_id IS
    'The moderator. Moderators act under their identity; the AUTHOR they act against is only ever identified by author_token (Architecture Sec 4.4: "the moderator blocks a pseudonym and never learns a name"). Never write an author user_id into this table.';
COMMENT ON COLUMN moderation_action.previous_value IS
    'JSONB snapshot of the affected fields BEFORE the action. This is what makes ADM-033 (admins may change a worker classification or caption) auditable rather than destructive: without it, an admin edit silently rewrites a worker observation and the original wording is gone forever. It is also the only source for the worker-vs-reviewer disagreement analysis CQA-005 anticipates.';
COMMENT ON COLUMN moderation_action.new_value IS
    'JSONB snapshot of the same fields AFTER the action. previous_value + new_value together make every admin edit replayable and reversible.';

CREATE INDEX idx_moderation_action_target
    ON moderation_action (target_type, target_id, created_at DESC);
CREATE INDEX idx_moderation_action_tenant_created
    ON moderation_action (tenant_id, created_at DESC);
CREATE INDEX idx_moderation_action_actor
    ON moderation_action (actor_membership_id, created_at DESC);


-- =====================================================================
-- SECTION 6. AUDIT LOG (APPEND-ONLY, MONTHLY RANGE PARTITIONED)
-- =====================================================================
--
-- Partitioned by month on occurred_at so that GDPR/contractual retention
-- is a DROP TABLE of one partition (instant, no bloat, no vacuum storm)
-- instead of a DELETE across tens of millions of rows.
--
-- PG16 CONSTRAINTS THAT SHAPE THIS TABLE:
--   1. Every UNIQUE/PRIMARY KEY on a partitioned table must contain the
--      partition key. Hence PRIMARY KEY (id, occurred_at), not (id).
--   2. PostgreSQL 16 does NOT support IDENTITY columns on partitioned
--      tables (that arrived in PG17), and bigserial is sugar for a
--      sequence plus a DEFAULT. Column defaults ARE inherited by
--      partitions, so the sequence is created explicitly and used via
--      DEFAULT nextval(...). Same effect as bigserial; works on PG16.

CREATE SEQUENCE audit_log_id_seq AS bigint START WITH 1 INCREMENT BY 1;

CREATE TABLE audit_log (
    id                  bigint      NOT NULL DEFAULT nextval('audit_log_id_seq'),
    tenant_id           uuid        NOT NULL,
    occurred_at         timestamptz NOT NULL DEFAULT now(),
    actor_type          text        NOT NULL,
    actor_token         char(32),
    actor_membership_id uuid,
    action              text        NOT NULL,
    entity_type         text        NOT NULL,
    entity_id           text,
    before              jsonb,
    after               jsonb,
    request_id          text,
    ip_hash             char(64),
    user_agent_hash     char(64),
    created_at          timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT pk_audit_log PRIMARY KEY (id, occurred_at),
    CONSTRAINT fk_audit_log_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenant (id),
    CONSTRAINT ck_audit_log_actor_type
        CHECK (actor_type IN ('user', 'guest', 'system', 'admin')),
    CONSTRAINT ck_audit_log_actor_token_format
        CHECK (actor_token IS NULL OR actor_token ~ '^[0-9A-Z]{32}$'),
    -- A guest has no membership row, so it can never carry a membership id.
    -- A system actor is neither a person nor a pseudonym.
    CONSTRAINT ck_audit_log_guest_has_no_membership
        CHECK (actor_type <> 'guest' OR actor_membership_id IS NULL),
    CONSTRAINT ck_audit_log_system_actor_is_impersonal
        CHECK (actor_type <> 'system'
               OR (actor_token IS NULL AND actor_membership_id IS NULL)),
    CONSTRAINT ck_audit_log_human_actor_identified
        CHECK (actor_type = 'system'
               OR actor_token IS NOT NULL OR actor_membership_id IS NOT NULL)
) PARTITION BY RANGE (occurred_at);

ALTER SEQUENCE audit_log_id_seq OWNED BY audit_log.id;

COMMENT ON TABLE  audit_log IS
    'APPEND-ONLY audit trail (Dev Pack Sec 7 "full audit trail maintained"). No UPDATE/DELETE grant to any runtime role (0007). Partitioned monthly by occurred_at so retention per tenant.retention_policy.audit_days is executed as DROP TABLE of a partition.';
COMMENT ON COLUMN audit_log.id IS
    'Monotonic ordering within the logical table. Sequence-backed rather than IDENTITY because PG16 does not allow identity columns on partitioned tables. Part of the PK together with the partition key.';
COMMENT ON COLUMN audit_log.occurred_at IS
    'Partition key. Business time of the audited action, set by the caller; created_at is the row-write time. They differ when the worker back-writes an audit row for a queued event.';
COMMENT ON COLUMN audit_log.actor_token IS
    'The actor pseudonym (author_token), NEVER a user_id, whenever the subject is an anonymous author. This column IS the "user identity masked in audit logs" requirement (Architecture Sec 4.3, Proposal slide 18). char(32) matches user_tenant_membership.author_token / guest_session.author_token exactly; there is deliberately no author_user_id column on this table at all.';
COMMENT ON COLUMN audit_log.actor_membership_id IS
    'Populated for admin/supervisor actions, which are NOT anonymous and must be attributable. Intentionally has NO foreign key: GDPR erasure deletes user_tenant_membership rows to destroy the pseudonym mapping, and an audit trail that can be truncated by a data-subject request is not an audit trail. The id becomes a dangling reference by design.';
COMMENT ON COLUMN audit_log.entity_id IS
    'text, not uuid: most entities are uuid-keyed but some are code-keyed (workflow_state_def.code, classification.code, tenant slug) and audit must cover them without a second column.';
COMMENT ON COLUMN audit_log.before IS
    'Pre-change state, PII-redacted by the serialiser allowlist (never raw row JSON -- a raw dump would reintroduce the email/user_id that the rest of this schema removes).';
COMMENT ON COLUMN audit_log.after IS
    'Post-change state, same allowlist as before.';
COMMENT ON COLUMN audit_log.request_id IS
    'Correlates an audit row with the API request log and with outbox_event rows emitted in the same transaction.';
COMMENT ON COLUMN audit_log.ip_hash IS
    'SHA-256 of (ip || per-tenant salt). HASHED, NOT RAW -- GDPR data minimisation: enough to detect one actor hammering an endpoint, not enough to geolocate a named worker.';
COMMENT ON COLUMN audit_log.user_agent_hash IS
    'SHA-256 of the user-agent string. Hashed for the same reason; a full UA string plus a timestamp is a strong device fingerprint and would undermine anonymity.';

CREATE INDEX idx_audit_log_tenant_occurred
    ON audit_log (tenant_id, occurred_at DESC);
CREATE INDEX idx_audit_log_entity
    ON audit_log (entity_type, entity_id, occurred_at DESC);
CREATE INDEX idx_audit_log_actor_token
    ON audit_log (actor_token, occurred_at DESC);
CREATE INDEX idx_audit_log_action
    ON audit_log (action, occurred_at DESC);

-- --- Partitions -------------------------------------------------------
-- At least one concrete partition MUST exist or every INSERT fails with
-- "no partition of relation found for row". Six months of headroom from
-- the pilot start plus a DEFAULT.
--
-- TO ADD A FUTURE MONTH (run monthly from the retention job, as OWNER):
--
--   CREATE TABLE audit_log_2027_01 PARTITION OF audit_log
--       FOR VALUES FROM ('2027-01-01 00:00:00+00') TO ('2027-02-01 00:00:00+00');
--   ALTER TABLE audit_log_2027_01 ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE audit_log_2027_01 FORCE  ROW LEVEL SECURITY;
--   CREATE POLICY pol_tenant_isolation_audit_log_2027_01 ON audit_log_2027_01
--       USING (current_setting('app.bypass_rls', true) = 'on'
--              OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
--       WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
--   GRANT INSERT ON audit_log_2027_01 TO safein5_app, safein5_worker, safein5_identity;
--   GRANT SELECT ON audit_log_2027_01 TO safein5_app;
--
-- CAUTION: creating a new range partition takes an ACCESS EXCLUSIVE lock
-- on the DEFAULT partition and scans it to prove no row belongs in the
-- new range. Keep the default empty by staying ahead of the calendar.
-- To retire a month: DROP TABLE audit_log_2026_07;

CREATE TABLE audit_log_2026_07 PARTITION OF audit_log
    FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');
CREATE TABLE audit_log_2026_08 PARTITION OF audit_log
    FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');
CREATE TABLE audit_log_2026_09 PARTITION OF audit_log
    FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');
CREATE TABLE audit_log_2026_10 PARTITION OF audit_log
    FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');
CREATE TABLE audit_log_2026_11 PARTITION OF audit_log
    FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');
CREATE TABLE audit_log_2026_12 PARTITION OF audit_log
    FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');
CREATE TABLE audit_log_default PARTITION OF audit_log DEFAULT;

COMMENT ON TABLE audit_log_default IS
    'Safety net so a missed monthly maintenance run degrades to slower queries instead of failed writes. Monitor: rows here mean the partition-creation job stopped.';


-- =====================================================================
-- SECTION 7. DEVICE SUBSCRIPTION (WEB PUSH / VAPID)
-- =====================================================================

CREATE TABLE device_subscription (
    id              uuid        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id       uuid        NOT NULL,
    user_id         uuid        NOT NULL,
    endpoint        text        NOT NULL,
    p256dh_key      text        NOT NULL,
    auth_key        text        NOT NULL,
    user_agent      text,
    last_success_at timestamptz,
    failure_count   integer     NOT NULL DEFAULT 0,
    expired_at      timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz,
    deleted_at      timestamptz,

    CONSTRAINT pk_device_subscription PRIMARY KEY (id),
    CONSTRAINT uq_device_subscription_endpoint UNIQUE (endpoint),
    CONSTRAINT fk_device_subscription_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenant (id),
    CONSTRAINT fk_device_subscription_user
        FOREIGN KEY (user_id) REFERENCES app_user (id),
    CONSTRAINT ck_device_subscription_failure_count CHECK (failure_count >= 0)
);

COMMENT ON TABLE  device_subscription IS
    'Web Push (VAPID) subscriptions. One row per browser/PWA install per user. PLATFORM LIMITATION, to be stated at UAT rather than filed as a bug: on iOS, Web Push requires iOS 16.4+ AND the PWA to have been added to the Home Screen -- Safari tabs cannot subscribe at all. On a UK quarry pilot with a majority-iPhone workforce this table will be sparsely populated, so push is a best-effort enhancement and the in-app notification row (channel = in_app) is the guaranteed delivery path. Never make a safety-critical loop (e.g. closure feedback, CQA-012) depend solely on web push.';
COMMENT ON COLUMN device_subscription.user_id IS
    'References app_user, not a membership: a browser install belongs to a person, and the same device may serve two tenants. tenant_id records which tenant context created the subscription and scopes RLS.';
COMMENT ON COLUMN device_subscription.endpoint IS
    'Push service URL returned by PushSubscription. Globally unique: the same browser must not be registered twice. Uniqueness is intentionally NOT scoped by tenant -- one physical browser is one endpoint, and a cross-tenant duplicate insert should fail loudly.';
COMMENT ON COLUMN device_subscription.p256dh_key IS
    'Client public key for payload encryption (RFC 8291). Not a secret of ours, but useless without the endpoint.';
COMMENT ON COLUMN device_subscription.auth_key IS
    'Client auth secret for payload encryption (RFC 8291).';
COMMENT ON COLUMN device_subscription.failure_count IS
    'Consecutive push failures. Backoff threshold for the dispatcher.';
COMMENT ON COLUMN device_subscription.expired_at IS
    'Set when the push service returns 404/410 (subscription gone). Row is retained and tombstoned, never hard deleted, so re-subscription churn per device stays measurable.';

CREATE INDEX idx_device_subscription_user
    ON device_subscription (user_id)
    WHERE deleted_at IS NULL AND expired_at IS NULL;
CREATE INDEX idx_device_subscription_tenant
    ON device_subscription (tenant_id)
    WHERE deleted_at IS NULL AND expired_at IS NULL;


-- =====================================================================
-- SECTION 8. NOTIFICATION
-- =====================================================================

CREATE TABLE notification (
    id                uuid        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id         uuid        NOT NULL,
    recipient_user_id uuid,
    recipient_scope   jsonb,
    kind              text        NOT NULL,
    payload           jsonb       NOT NULL DEFAULT '{}'::jsonb,
    channel           text        NOT NULL,
    state             text        NOT NULL DEFAULT 'queued',
    dedupe_key        text,
    outbox_event_id   uuid,
    attempt_count     integer     NOT NULL DEFAULT 0,
    last_error        text,
    sent_at           timestamptz,
    read_at           timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz,
    deleted_at        timestamptz,

    CONSTRAINT pk_notification PRIMARY KEY (id),
    CONSTRAINT fk_notification_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenant (id),
    CONSTRAINT fk_notification_recipient
        FOREIGN KEY (recipient_user_id) REFERENCES app_user (id),
    CONSTRAINT ck_notification_kind
        CHECK (kind IN ('signal_acknowledged', 'signal_closed',
                        'new_needs_attention_in_zone', 'learn5_assigned',
                        'invitation')),
    CONSTRAINT ck_notification_channel
        CHECK (channel IN ('web_push', 'email', 'in_app')),
    CONSTRAINT ck_notification_state
        CHECK (state IN ('queued', 'sent', 'failed', 'suppressed')),
    CONSTRAINT ck_notification_sent_state
        CHECK (state <> 'sent' OR sent_at IS NOT NULL),
    CONSTRAINT ck_notification_target_present
        CHECK (recipient_user_id IS NOT NULL OR recipient_scope IS NOT NULL),
    CONSTRAINT ck_notification_scope_object
        CHECK (recipient_scope IS NULL OR jsonb_typeof(recipient_scope) = 'object'),
    CONSTRAINT ck_notification_attempt_count CHECK (attempt_count >= 0)
);

COMMENT ON TABLE  notification IS
    'One row per intended delivery (recipient x channel). Rendering, sending and read state all hang off this row so "was the worker told?" is answerable from one table.';
COMMENT ON COLUMN notification.recipient_user_id IS
    'NULL for broadcasts (zone-wide alerts, WRK-022) which target a scope rather than a person. Populated for a closure notification even when the underlying signal is anonymous: the dispatcher resolves author_token -> membership -> user through the Identity module only, so the identity appears here and NEVER on the signal (Architecture Sec 4.4).';
COMMENT ON COLUMN notification.recipient_scope IS
    'Broadcast target, e.g. {"site_id": "..."} or {"sub_site_id": "..."} (WRK-022). Fan-out to devices happens at send time, not at queue time, so a worker who joins the zone after queueing is still reached.';
COMMENT ON COLUMN notification.payload IS
    'Rendered notification content plus deep-link refs. Pseudonymised like outbox payloads: it may carry authorToken and signalId, never another worker''s name.';
COMMENT ON COLUMN notification.dedupe_key IS
    'Caller-computed idempotency key, e.g. "signal_closed:<signalId>:<userId>" or "zone_alert:<subSiteId>:<yyyymmddhh>". Enforced by uq_notification_dedupe below.';
COMMENT ON COLUMN notification.outbox_event_id IS
    'Logical reference to outbox_event.event_id (the event that caused this notification). Deliberately NOT a foreign key: outbox_event is range-partitioned, so its only available unique key is the composite (event_id, occurred_at), and PostgreSQL cannot FK a single column against it. Joins are by value.';
COMMENT ON COLUMN notification.read_at IS
    'In-app read receipt. Distinct from sent_at: sent means we delivered, read means the worker actually saw it -- the difference is the honest measure of the feedback loop.';

-- THE single most effective defence against notification storms.
-- One partial unique index makes "send it again" a no-op at the storage
-- layer, so a retried consumer, a duplicated outbox event and a threshold
-- rule that fires twice in the same window all collapse into one
-- delivery. Without it, the first time a rule misfires every phone in a
-- quarry buzzes repeatedly and the pilot's trust in notifications is gone
-- permanently -- and no amount of application-level guarding survives two
-- worker processes running concurrently. Scoped per tenant and per
-- channel: the same event legitimately produces one web_push AND one
-- in_app row.
CREATE UNIQUE INDEX uq_notification_dedupe
    ON notification (tenant_id, channel, dedupe_key)
    WHERE dedupe_key IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_notification_recipient_created
    ON notification (recipient_user_id, created_at DESC)
    WHERE deleted_at IS NULL AND recipient_user_id IS NOT NULL;
CREATE INDEX idx_notification_queued
    ON notification (tenant_id, created_at)
    WHERE state = 'queued' AND deleted_at IS NULL;
CREATE INDEX idx_notification_unread
    ON notification (recipient_user_id)
    WHERE read_at IS NULL AND state = 'sent' AND deleted_at IS NULL;


-- =====================================================================
-- SECTION 9. OUTBOX EVENT (MONTHLY RANGE PARTITIONED)
-- =====================================================================
--
-- THIS TABLE IS THE MOST VALUABLE ARTEFACT THE MVP PRODUCES.
--
-- Every write path emits here in the same transaction as the domain write
-- (transactional outbox), and the flusher publishes asynchronously.
-- Beyond reliable delivery, the accumulated stream IS the
-- training/analysis corpus for the future SIGNAL intelligence layer
-- (Architecture Sec 8).
--
-- RETENTION: rows are NEVER deleted after publishing during the pilot.
-- Publishing sets published_at; it does not remove anything. The monthly
-- partitioning here is for index locality and future archival (detach +
-- move to cold storage), NOT for deletion. Do not point the audit
-- retention job at this table.
--
-- Same PG16 caveats as audit_log: the PK must contain the partition key,
-- and the sequence is explicit because PG16 rejects IDENTITY on
-- partitioned tables.

CREATE SEQUENCE outbox_event_id_seq AS bigint START WITH 1 INCREMENT BY 1;

CREATE TABLE outbox_event (
    id              bigint      NOT NULL DEFAULT nextval('outbox_event_id_seq'),
    event_id        uuid        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id       uuid        NOT NULL,
    event_type      text        NOT NULL,
    event_version   integer     NOT NULL DEFAULT 1,
    aggregate_type  text        NOT NULL,
    aggregate_id    uuid,
    payload         jsonb       NOT NULL DEFAULT '{}'::jsonb,
    occurred_at     timestamptz NOT NULL DEFAULT now(),
    published_at    timestamptz,
    attempt_count   integer     NOT NULL DEFAULT 0,
    last_error      text,
    next_attempt_at timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT pk_outbox_event PRIMARY KEY (id, occurred_at),
    CONSTRAINT uq_outbox_event_event_id UNIQUE (event_id, occurred_at),
    CONSTRAINT fk_outbox_event_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenant (id),
    CONSTRAINT ck_outbox_event_type_format
        CHECK (event_type ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'),
    CONSTRAINT ck_outbox_event_version CHECK (event_version >= 1),
    CONSTRAINT ck_outbox_event_attempt_count CHECK (attempt_count >= 0),
    -- Pseudonymisation guard. Payloads carry authorToken, never a user id
    -- or an email (Architecture Sec 4.3 / Sec 8): the stream must be
    -- replayable into an analytics store with no re-scrubbing pass.
    -- Top-level keys only -- a cheap structural tripwire that catches the
    -- common mistake in CI and in production, not a substitute for the
    -- serialiser allowlist.
    CONSTRAINT ck_outbox_event_payload_pseudonymous
        CHECK (NOT (payload ?| ARRAY['userId', 'user_id', 'email',
                                     'authorUserId', 'author_user_id',
                                     'displayName', 'display_name']))
) PARTITION BY RANGE (occurred_at);

ALTER SEQUENCE outbox_event_id_seq OWNED BY outbox_event.id;

COMMENT ON TABLE  outbox_event IS
    'Transactional outbox AND the SIGNAL training corpus (Architecture Sec 8). Written in the same transaction as every domain change; published asynchronously by safein5-worker. APPEND-ONLY for the application role; only the flusher may UPDATE the delivery columns. ROWS ARE NEVER DELETED AFTER PUBLISHING DURING THE PILOT -- this stream is the single most valuable artefact the MVP produces and it cannot be reconstructed after the fact.';
COMMENT ON COLUMN outbox_event.id IS
    'Monotonic ordering within a partition. Sequence-backed, not IDENTITY (PG16 does not allow identity columns on partitioned tables). Part of the PK with the partition key.';
COMMENT ON COLUMN outbox_event.event_id IS
    'Consumer idempotency key. Every MVP consumer is idempotent on this value. Uniqueness is enforced as (event_id, occurred_at) because a unique constraint on a partitioned table must include the partition key; event_id is a random UUID, so this is uniqueness in practice as well as in intent.';
COMMENT ON COLUMN outbox_event.event_type IS
    'Naming: <aggregate>.<past-tense-verb>, e.g. signal.finalised, review_task.closed, qr.scanned (Architecture Sec 8). Format enforced by CHECK so a typo cannot silently create a new event type nobody consumes.';
COMMENT ON COLUMN outbox_event.event_version IS
    'Schema version of payload, from 1. Present from day one on purpose: a versionless event stream is unreadable in 18 months. Never mutate an existing version''s shape -- increment.';
COMMENT ON COLUMN outbox_event.aggregate_type IS
    'Aggregate the event belongs to (behaviour_signal, review_task, qr_code, ...). With aggregate_id this reconstructs a per-object history.';
COMMENT ON COLUMN outbox_event.payload IS
    'PSEUDONYMISED AT WRITE TIME. Carries authorToken, NEVER user_id, email or display name -- enforced structurally by ck_outbox_event_payload_pseudonymous and properly by the serialiser allowlist. This is what lets the whole stream be replayed into an analytics store without a scrubbing pass.';
COMMENT ON COLUMN outbox_event.occurred_at IS
    'Partition key and business time of the event. Ordering for consumers is (occurred_at, id).';
COMMENT ON COLUMN outbox_event.published_at IS
    'NULL means pending. Set by the flusher on successful publish; the row is retained forever afterwards.';
COMMENT ON COLUMN outbox_event.next_attempt_at IS
    'Exponential backoff schedule for the flusher. NULL means eligible immediately.';
COMMENT ON COLUMN outbox_event.last_error IS
    'Last publish failure. Truncate before writing -- a provider stack trace loop can otherwise dominate table size.';

-- The flusher poll. Partial index so it stays tiny (bounded by the
-- pending backlog) even as the retained corpus grows to millions of rows.
CREATE INDEX idx_outbox_event_unpublished
    ON outbox_event (next_attempt_at NULLS FIRST, occurred_at, id)
    WHERE published_at IS NULL;

CREATE INDEX idx_outbox_event_tenant_occurred
    ON outbox_event (tenant_id, occurred_at DESC);
CREATE INDEX idx_outbox_event_type_occurred
    ON outbox_event (event_type, occurred_at DESC);
CREATE INDEX idx_outbox_event_aggregate
    ON outbox_event (aggregate_type, aggregate_id, occurred_at DESC);

-- --- Partitions -------------------------------------------------------
-- Same monthly procedure and the same ACCESS EXCLUSIVE caveat on the
-- DEFAULT partition as audit_log. DO NOT DROP outbox partitions during
-- the pilot (see table comment).

CREATE TABLE outbox_event_2026_07 PARTITION OF outbox_event
    FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');
CREATE TABLE outbox_event_2026_08 PARTITION OF outbox_event
    FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');
CREATE TABLE outbox_event_2026_09 PARTITION OF outbox_event
    FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');
CREATE TABLE outbox_event_2026_10 PARTITION OF outbox_event
    FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');
CREATE TABLE outbox_event_2026_11 PARTITION OF outbox_event
    FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');
CREATE TABLE outbox_event_2026_12 PARTITION OF outbox_event
    FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');
CREATE TABLE outbox_event_default PARTITION OF outbox_event DEFAULT;

COMMENT ON TABLE outbox_event_default IS
    'Safety net so a missed monthly maintenance run degrades to slower queries instead of failed writes -- and for this table a failed write is a failed domain transaction, because the outbox insert shares it. Alert on any rows landing here.';


-- =====================================================================
-- SECTION 10. updated_at TRIGGERS
--   Mutable tables only. Append-only tables (workflow_transition,
--   moderation_action, audit_log, outbox_event) have no updated_at by
--   design; outbox_event's delivery columns are mutated by the flusher
--   under a column-level grant instead.
-- =====================================================================

CREATE TRIGGER trg_workflow_state_def_updated_at
    BEFORE UPDATE ON workflow_state_def
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_workflow_transition_def_updated_at
    BEFORE UPDATE ON workflow_transition_def
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_review_task_updated_at
    BEFORE UPDATE ON review_task
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_evidence_updated_at
    BEFORE UPDATE ON evidence
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_device_subscription_updated_at
    BEFORE UPDATE ON device_subscription
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_notification_updated_at
    BEFORE UPDATE ON notification
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =====================================================================
-- SECTION 11. ROW-LEVEL SECURITY
-- =====================================================================
--
-- Standard policy shape (Architecture Sec 3.3):
--   USING      : bypass GUC OR tenant match          (reads)
--   WITH CHECK : tenant match ONLY, no bypass clause (writes)
-- so even the cross-tenant flusher physically cannot write a row into the
-- wrong tenant. current_setting(..., true) returns NULL when unset, so an
-- unset GUC yields NULL -> not true -> zero rows: fail closed.
--
-- PARTITIONED TABLES -- the part that is easy to get wrong: when a
-- partitioned table is queried through the PARENT, the parent's policies
-- apply to rows from all partitions (and INSERT routing checks the
-- parent's WITH CHECK). But a partition queried DIRECTLY
-- (SELECT ... FROM audit_log_2026_08) is a table in its own right: the
-- parent's policies do not apply to it, only its own. RLS is also NOT
-- inherited -- CREATE TABLE ... PARTITION OF copies neither ENABLE/FORCE
-- nor policies. Therefore policies are declared on the parent AND on
-- every partition, and the "add a future month" runbook above includes
-- the three RLS statements. Duplicated permissive policies with the same
-- predicate OR together, so parent+partition enforcement costs nothing
-- and removes the "someone queried the partition directly" hole.

ALTER TABLE review_task ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_task FORCE  ROW LEVEL SECURITY;
CREATE POLICY pol_tenant_isolation_review_task ON review_task
    USING (current_setting('app.bypass_rls', true) = 'on'
           OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE workflow_transition ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_transition FORCE  ROW LEVEL SECURITY;
CREATE POLICY pol_tenant_isolation_workflow_transition ON workflow_transition
    USING (current_setting('app.bypass_rls', true) = 'on'
           OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence FORCE  ROW LEVEL SECURITY;
CREATE POLICY pol_tenant_isolation_evidence ON evidence
    USING (current_setting('app.bypass_rls', true) = 'on'
           OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE moderation_action ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_action FORCE  ROW LEVEL SECURITY;
CREATE POLICY pol_tenant_isolation_moderation_action ON moderation_action
    USING (current_setting('app.bypass_rls', true) = 'on'
           OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE device_subscription ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_subscription FORCE  ROW LEVEL SECURITY;
CREATE POLICY pol_tenant_isolation_device_subscription ON device_subscription
    USING (current_setting('app.bypass_rls', true) = 'on'
           OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE notification ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification FORCE  ROW LEVEL SECURITY;
CREATE POLICY pol_tenant_isolation_notification ON notification
    USING (current_setting('app.bypass_rls', true) = 'on'
           OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

-- --- audit_log (parent + every partition) -----------------------------
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE  ROW LEVEL SECURITY;
CREATE POLICY pol_tenant_isolation_audit_log ON audit_log
    USING (current_setting('app.bypass_rls', true) = 'on'
           OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE audit_log_2026_07 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log_2026_07 FORCE  ROW LEVEL SECURITY;
CREATE POLICY pol_tenant_isolation_audit_log_2026_07 ON audit_log_2026_07
    USING (current_setting('app.bypass_rls', true) = 'on'
           OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE audit_log_2026_08 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log_2026_08 FORCE  ROW LEVEL SECURITY;
CREATE POLICY pol_tenant_isolation_audit_log_2026_08 ON audit_log_2026_08
    USING (current_setting('app.bypass_rls', true) = 'on'
           OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE audit_log_2026_09 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log_2026_09 FORCE  ROW LEVEL SECURITY;
CREATE POLICY pol_tenant_isolation_audit_log_2026_09 ON audit_log_2026_09
    USING (current_setting('app.bypass_rls', true) = 'on'
           OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE audit_log_2026_10 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log_2026_10 FORCE  ROW LEVEL SECURITY;
CREATE POLICY pol_tenant_isolation_audit_log_2026_10 ON audit_log_2026_10
    USING (current_setting('app.bypass_rls', true) = 'on'
           OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE audit_log_2026_11 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log_2026_11 FORCE  ROW LEVEL SECURITY;
CREATE POLICY pol_tenant_isolation_audit_log_2026_11 ON audit_log_2026_11
    USING (current_setting('app.bypass_rls', true) = 'on'
           OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE audit_log_2026_12 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log_2026_12 FORCE  ROW LEVEL SECURITY;
CREATE POLICY pol_tenant_isolation_audit_log_2026_12 ON audit_log_2026_12
    USING (current_setting('app.bypass_rls', true) = 'on'
           OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE audit_log_default ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log_default FORCE  ROW LEVEL SECURITY;
CREATE POLICY pol_tenant_isolation_audit_log_default ON audit_log_default
    USING (current_setting('app.bypass_rls', true) = 'on'
           OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

-- --- outbox_event (parent + every partition) --------------------------
ALTER TABLE outbox_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_event FORCE  ROW LEVEL SECURITY;
CREATE POLICY pol_tenant_isolation_outbox_event ON outbox_event
    USING (current_setting('app.bypass_rls', true) = 'on'
           OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE outbox_event_2026_07 ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_event_2026_07 FORCE  ROW LEVEL SECURITY;
CREATE POLICY pol_tenant_isolation_outbox_event_2026_07 ON outbox_event_2026_07
    USING (current_setting('app.bypass_rls', true) = 'on'
           OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE outbox_event_2026_08 ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_event_2026_08 FORCE  ROW LEVEL SECURITY;
CREATE POLICY pol_tenant_isolation_outbox_event_2026_08 ON outbox_event_2026_08
    USING (current_setting('app.bypass_rls', true) = 'on'
           OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE outbox_event_2026_09 ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_event_2026_09 FORCE  ROW LEVEL SECURITY;
CREATE POLICY pol_tenant_isolation_outbox_event_2026_09 ON outbox_event_2026_09
    USING (current_setting('app.bypass_rls', true) = 'on'
           OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE outbox_event_2026_10 ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_event_2026_10 FORCE  ROW LEVEL SECURITY;
CREATE POLICY pol_tenant_isolation_outbox_event_2026_10 ON outbox_event_2026_10
    USING (current_setting('app.bypass_rls', true) = 'on'
           OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE outbox_event_2026_11 ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_event_2026_11 FORCE  ROW LEVEL SECURITY;
CREATE POLICY pol_tenant_isolation_outbox_event_2026_11 ON outbox_event_2026_11
    USING (current_setting('app.bypass_rls', true) = 'on'
           OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE outbox_event_2026_12 ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_event_2026_12 FORCE  ROW LEVEL SECURITY;
CREATE POLICY pol_tenant_isolation_outbox_event_2026_12 ON outbox_event_2026_12
    USING (current_setting('app.bypass_rls', true) = 'on'
           OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE outbox_event_default ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_event_default FORCE  ROW LEVEL SECURITY;
CREATE POLICY pol_tenant_isolation_outbox_event_default ON outbox_event_default
    USING (current_setting('app.bypass_rls', true) = 'on'
           OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

-- workflow_state_def and workflow_transition_def are global config, NOT
-- tenant-scoped, so they carry no tenant_id and no RLS -- deliberately.
-- They are read-only to every runtime role; changing the state machine is
-- a migration or a seed change performed by the migrator role.

-- =====================================================================
-- End of migration 0006. Roles and grants: see 0007_rls_roles.sql.
-- =====================================================================
