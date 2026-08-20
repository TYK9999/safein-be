-- =====================================================================
-- SafeIn5 MVP -- Migration 0005: THE SIGNAL CORE
--
-- Tables created here:
--   classification                 (global reference, seeded, NOT tenant-scoped)
--   pulse_session
--   behaviour_signal
--   signal_media
--   signal_classification_event    (append-only)
--   signal_read_state
--
-- Source of truth: SafeIn5-MVP-Architecture.md Sec 2.4 (Signal Core),
-- Sec 3 (RLS), Sec 4 (Anonymity), Sec 5 (media state machine),
-- Sec 8 (outbox taxonomy).
--
-- Depends on 0001 (tenant/site/sub_site/asset), 0002 (app_user,
-- guest_session), 0003 (qr_code, task_type, risk_type).
-- Every foreign key below is declared statically against a table that
-- already exists. There are no conditional / catalogue-probing FK blocks:
-- migrations run once, in order, and a missing parent must be a hard
-- failure at deploy time rather than a NOTICE nobody reads.
--
-- Roles and grants live in 0007_rls_roles.sql. Plain ASCII only.
-- =====================================================================


-- =====================================================================
-- 1. classification -- GLOBAL reference table (ADM-035: no CRUD in MVP)
-- =====================================================================

CREATE TABLE classification (
    code                text        NOT NULL,
    label               text        NOT NULL,
    severity_ordinal    smallint    NOT NULL,
    colour_token        text        NOT NULL,
    sort_order          integer     NOT NULL,
    triggers_workflow   boolean     NOT NULL DEFAULT false,
    is_active           boolean     NOT NULL DEFAULT true,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz,

    CONSTRAINT pk_classification              PRIMARY KEY (code),
    CONSTRAINT uq_classification_label        UNIQUE (label),
    CONSTRAINT uq_classification_severity     UNIQUE (severity_ordinal),
    CONSTRAINT ck_classification_code         CHECK (code = lower(code) AND code <> ''),
    CONSTRAINT ck_classification_severity     CHECK (severity_ordinal >= 1),
    CONSTRAINT ck_classification_colour_token CHECK (colour_token IN ('green', 'amber', 'red'))
);

CREATE TRIGGER trg_classification_updated_at
    BEFORE UPDATE ON classification
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  classification IS
    'Global, seeded reference list of the three SafeIn5 signal classifications. NOT tenant-scoped and NOT RLS-protected: ADM-035 gives it no CRUD in MVP and every tenant classifies against the same three tiles, which is what makes cross-tenant benchmarking possible later. text PK (not a PG ENUM) so Phase 2 adds a tier with an INSERT, never an ALTER TYPE.';
COMMENT ON COLUMN classification.code IS
    'Stable machine code. Referenced by behaviour_signal.classification_code and carried in every outbox payload; never renamed once seeded.';
COMMENT ON COLUMN classification.label IS
    'Worker-facing tile label. CQA-005: the agreed labels are Good Practice / Be Aware / Needs Attention Now. "Emerging Risk" and "Stop and Act Now" were explicitly rejected by the client and must not reappear.';
COMMENT ON COLUMN classification.severity_ordinal IS
    'Ascending severity (1 = Good Practice .. 3 = Needs Attention Now). Exists so WRK-013 "red first" feed ordering happens in SQL -- ORDER BY severity_ordinal DESC, created_at DESC -- rather than being re-implemented (and drifting) in application code. UNIQUE so two tiers can never claim the same sort rank.';
COMMENT ON COLUMN classification.colour_token IS
    'Design-system colour token, not a hex value: theming is per-tenant (tenant.theme) and the mapping token -> hex belongs in the client.';
COMMENT ON COLUMN classification.triggers_workflow IS
    'true => the outbox consumer WorkflowTaskCreator opens a review_task on signal.finalised. Only needs_attention_now at MVP. Config-as-data: turning Be Aware into a workflow trigger is an UPDATE, not a deploy.';
COMMENT ON COLUMN classification.is_active IS
    'Soft retirement of a tier. Historic signals keep referencing an inactive code; the capture UI filters on is_active = true.';

INSERT INTO classification (code, label, severity_ordinal, colour_token, sort_order, triggers_workflow, is_active) VALUES
    ('good_practice',       'Good Practice',       1, 'green', 1, false, true),
    ('be_aware',            'Be Aware',            2, 'amber', 2, false, true),
    ('needs_attention_now', 'Needs Attention Now', 3, 'red',   3, true,  true);


-- =====================================================================
-- 2. pulse_session -- Architecture Sec 2.4
-- =====================================================================

CREATE TABLE pulse_session (
    id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id           uuid        NOT NULL,

    author_token        char(32)    NOT NULL,
    author_user_id      uuid        NULL,
    is_anonymous        boolean     NOT NULL DEFAULT false,
    guest_session_id    uuid        NULL,

    entry_point         text        NOT NULL DEFAULT 'direct',
    qr_code_id          uuid        NULL,
    pulse_template_id   uuid        NULL,

    context_snapshot    jsonb       NOT NULL DEFAULT '{}'::jsonb,
    site_id             uuid        NULL,
    sub_site_id         uuid        NULL,
    asset_id            uuid        NULL,
    task_type_code      text        NULL,
    risk_type_code      text        NULL,

    geo_lat             numeric(9,6) NULL,
    geo_lon             numeric(9,6) NULL,
    geo_accuracy_m      numeric(7,2) NULL,

    started_at          timestamptz NOT NULL DEFAULT now(),
    completed_at        timestamptz NULL,
    steps_completed     text[]      NOT NULL DEFAULT '{}'::text[],
    duration_ms         integer     NULL,
    outcome             text        NOT NULL DEFAULT 'abandoned',

    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz,
    deleted_at          timestamptz,

    CONSTRAINT pk_pulse_session PRIMARY KEY (id),

    CONSTRAINT fk_pulse_session_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenant (id),
    CONSTRAINT fk_pulse_session_author_user
        FOREIGN KEY (author_user_id) REFERENCES app_user (id),
    CONSTRAINT fk_pulse_session_guest_session
        FOREIGN KEY (guest_session_id, tenant_id) REFERENCES guest_session (id, tenant_id),
    CONSTRAINT fk_pulse_session_qr_code
        FOREIGN KEY (qr_code_id, tenant_id) REFERENCES qr_code (id, tenant_id),
    CONSTRAINT fk_pulse_session_pulse_template
        FOREIGN KEY (pulse_template_id) REFERENCES pulse_template (id),
    CONSTRAINT fk_pulse_session_site
        FOREIGN KEY (site_id, tenant_id) REFERENCES site (id, tenant_id),
    CONSTRAINT fk_pulse_session_sub_site
        FOREIGN KEY (sub_site_id, tenant_id) REFERENCES sub_site (id, tenant_id),
    CONSTRAINT fk_pulse_session_asset
        FOREIGN KEY (asset_id, tenant_id) REFERENCES asset (id, tenant_id),
    CONSTRAINT fk_pulse_session_task_type
        FOREIGN KEY (task_type_code) REFERENCES task_type (code),
    CONSTRAINT fk_pulse_session_risk_type
        FOREIGN KEY (risk_type_code) REFERENCES risk_type (code),

    CONSTRAINT ck_pulse_session_entry_point
        CHECK (entry_point IN ('qr', 'direct', 'feed', 'notification')),
    CONSTRAINT ck_pulse_session_outcome
        CHECK (outcome IN ('abandoned', 'completed', 'completed_with_signal')),
    CONSTRAINT ck_pulse_session_author_token_format
        CHECK (author_token ~ '^[0-9A-Z]{32}$'),
    CONSTRAINT ck_pulse_session_anonymity
        CHECK (is_anonymous = false OR author_user_id IS NULL),
    CONSTRAINT ck_pulse_session_steps_completed
        CHECK (steps_completed <@ ARRAY['P','U','L','S','E']::text[]),
    CONSTRAINT ck_pulse_session_duration_ms
        CHECK (duration_ms IS NULL OR duration_ms >= 0),
    CONSTRAINT ck_pulse_session_completed_at
        CHECK (completed_at IS NULL OR completed_at >= started_at),
    CONSTRAINT ck_pulse_session_geo_pair
        CHECK ((geo_lat IS NULL) = (geo_lon IS NULL)),
    CONSTRAINT ck_pulse_session_geo_range
        CHECK (
                (geo_lat IS NULL OR (geo_lat BETWEEN -90  AND 90))
            AND (geo_lon IS NULL OR (geo_lon BETWEEN -180 AND 180))
            AND (geo_accuracy_m IS NULL OR geo_accuracy_m >= 0)
        )
);

ALTER TABLE pulse_session
    ADD CONSTRAINT uq_pulse_session_id_tenant UNIQUE (id, tenant_id);

CREATE TRIGGER trg_pulse_session_updated_at
    BEFORE UPDATE ON pulse_session
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  pulse_session IS
    'One PULSE (P/U/L/S/E) walkthrough. The Echo half of the Echo -> Signal pair: a session may complete without producing a behaviour_signal, and that abandonment is itself the metric (PRD Sec 5.7 repeat-scan fatigue). Anonymity shape is identical to behaviour_signal by design -- a session that could be attributed while the signal it produced could not would defeat the promise.';
COMMENT ON COLUMN pulse_session.author_token IS
    'Deterministic per-user-per-tenant pseudonym (Architecture Sec 4.2). ALWAYS populated, anonymous or not. Never a raw user id. Guests carry one too, which is what keeps repeat-usage countable across guest and registered activity.';
COMMENT ON COLUMN pulse_session.author_user_id IS
    'NULL when the session was anonymous. Enforced by ck_pulse_session_anonymity -- see behaviour_signal.author_user_id for the full rationale.';
COMMENT ON COLUMN pulse_session.is_anonymous IS
    'Materialised at session start from the account setting. The setting may change later; the promise made at capture time must not.';
COMMENT ON COLUMN pulse_session.entry_point IS
    '[SIGNAL] Attribution of which entry points actually drive behaviour (qr vs direct vs feed vs notification). Written at MVP, unread by MVP features.';
COMMENT ON COLUMN pulse_session.pulse_template_id IS
    'The template whose prompts were actually rendered. Templates are versioned rather than mutated, so this row remains interpretable months later.';
COMMENT ON COLUMN pulse_session.context_snapshot IS
    'Immutable denormalised copy of the resolved context at session start (site/sub_site/asset/task/risk/qr_context_version). Never updated. The FK columns beside it are for querying; this is historical truth -- a sub_site renamed six months later must not rewrite what the worker was actually standing in.';
COMMENT ON COLUMN pulse_session.site_id IS
    'Denormalised from context_snapshot purely for indexed querying. context_snapshot is authoritative for what the context meant at the time.';
COMMENT ON COLUMN pulse_session.task_type_code IS
    '[SIGNAL] Structured task vocabulary copied from the resolved context. Same axis as behaviour_signal.task_type_code, so PULSE engagement and signal output can be grouped on identical keys.';
COMMENT ON COLUMN pulse_session.risk_type_code IS
    '[SIGNAL] Structured risk vocabulary copied from the resolved context. See task_type_code.';
COMMENT ON COLUMN pulse_session.geo_lat IS
    'Optional and permission-gated (Dev Pack Sec 5). Rounded to 3 decimal places (~110 m) by the application before storage on anonymous sessions -- Architecture Sec 4.3.';
COMMENT ON COLUMN pulse_session.steps_completed IS
    '[SIGNAL] Which of P/U/L/S/E were actually viewed. Feeds the PULSE completion-rate success metric; unreconstructable after the fact.';
COMMENT ON COLUMN pulse_session.duration_ms IS
    '[SIGNAL] Wall-clock session duration, client-reported.';
COMMENT ON COLUMN pulse_session.outcome IS
    'abandoned | completed | completed_with_signal. Defaults to abandoned so a session that is never completed records the truth without a reaper having to write it.';
COMMENT ON COLUMN pulse_session.deleted_at IS
    'Soft delete. Nothing in this schema is ever hard-deleted; GDPR erasure works by tombstoning the user and destroying the token mapping (Architecture Sec 4.4).';

CREATE INDEX idx_pulse_session_tenant_started
    ON pulse_session (tenant_id, started_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_pulse_session_author_token
    ON pulse_session (author_token, started_at DESC);

CREATE INDEX idx_pulse_session_tenant_site
    ON pulse_session (tenant_id, site_id, started_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_pulse_session_qr_code
    ON pulse_session (qr_code_id, started_at DESC)
    WHERE qr_code_id IS NOT NULL;


-- =====================================================================
-- 3. behaviour_signal -- Architecture Sec 2.4. The core object.
--    Draft and final are the SAME ROW, distinguished by status.
--
--    ZERO MANDATORY FIELDS AT CAPTURE: body_text, all media and
--    classification_code are nullable, so a draft row is insertable with
--    tenant_id + author_token + status (and the defaults) alone.
-- =====================================================================

CREATE TABLE behaviour_signal (
    -- Client-generated UUIDv7. The client mints the id before any network
    -- call so that POST /v1/signals/draft is idempotent on retry over a
    -- flaky quarry 3G link (Architecture Sec 5.1 steps 3-4). The default
    -- below is a server-side safety net for admin/backfill inserts ONLY.
    id                        uuid        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id                 uuid        NOT NULL,

    status                    text        NOT NULL DEFAULT 'draft',
    visibility                text        NOT NULL DEFAULT 'site',

    author_token              char(32)    NOT NULL,
    author_user_id            uuid        NULL,
    is_anonymous              boolean     NOT NULL DEFAULT false,
    guest_session_id          uuid        NULL,

    pulse_session_id          uuid        NULL,
    qr_code_id                uuid        NULL,
    entry_point               text        NULL,

    classification_code       text        NULL,
    classified_at             timestamptz NULL,
    classification_latency_ms integer     NULL,
    capture_latency_ms        integer     NULL,

    body_text                 text        NULL,
    body_source               text        NOT NULL DEFAULT 'none',
    transcript_confidence     numeric(4,3) NULL,

    site_id                   uuid        NULL,
    sub_site_id               uuid        NULL,
    asset_id                  uuid        NULL,
    context_snapshot          jsonb       NOT NULL DEFAULT '{}'::jsonb,
    task_type_code            text        NULL,
    risk_type_code            text        NULL,

    geo_lat                   numeric(9,6) NULL,
    geo_lon                   numeric(9,6) NULL,
    geo_accuracy_m            numeric(7,2) NULL,

    occurred_at               timestamptz NOT NULL DEFAULT now(),
    finalised_at              timestamptz NULL,

    media_state               text        NOT NULL DEFAULT 'none',
    moderation_state          text        NOT NULL DEFAULT 'visible',
    workflow_state            text        NULL,

    search_vector             tsvector
                              GENERATED ALWAYS AS
                              (to_tsvector('english'::regconfig, coalesce(body_text, ''))) STORED,

    duplicate_of_id           uuid        NULL,
    similarity_group_id       uuid        NULL,

    created_at                timestamptz NOT NULL DEFAULT now(),
    updated_at                timestamptz,
    deleted_at                timestamptz,

    CONSTRAINT pk_behaviour_signal PRIMARY KEY (id),

    -- ---- state machine -------------------------------------------------
    CONSTRAINT ck_behaviour_signal_status
        CHECK (status IN ('draft', 'classified', 'final', 'discarded')),
    CONSTRAINT ck_behaviour_signal_final_requires_finalised_at
        CHECK (status <> 'final' OR finalised_at IS NOT NULL),
    CONSTRAINT ck_behaviour_signal_classified_requires_code
        CHECK (status NOT IN ('classified', 'final') OR classification_code IS NOT NULL),
    CONSTRAINT ck_behaviour_signal_classified_at
        CHECK (classification_code IS NULL OR classified_at IS NOT NULL),

    -- ---- visibility / moderation / workflow ----------------------------
    CONSTRAINT ck_behaviour_signal_visibility
        CHECK (visibility IN ('site', 'tenant', 'public')),
    CONSTRAINT ck_behaviour_signal_moderation_state
        CHECK (moderation_state IN ('visible', 'hidden', 'removed', 'under_review')),
    CONSTRAINT ck_behaviour_signal_workflow_state
        CHECK (workflow_state IS NULL OR workflow_state IN ('open', 'acknowledged', 'closed')),
    CONSTRAINT ck_behaviour_signal_media_state
        CHECK (media_state IN ('none', 'pending', 'partial', 'ready', 'failed')),

    -- ---- anonymity: the single most important constraint in the schema --
    CONSTRAINT ck_behaviour_signal_anonymity
        CHECK (is_anonymous = false OR author_user_id IS NULL),
    CONSTRAINT ck_behaviour_signal_author_token_format
        CHECK (author_token ~ '^[0-9A-Z]{32}$'),

    -- ---- capture / body ------------------------------------------------
    CONSTRAINT ck_behaviour_signal_body_source
        CHECK (body_source IN ('typed', 'voice_transcript', 'none')),
    CONSTRAINT ck_behaviour_signal_entry_point
        CHECK (entry_point IS NULL OR entry_point IN ('qr', 'direct', 'feed', 'notification')),
    CONSTRAINT ck_behaviour_signal_transcript_confidence
        CHECK (transcript_confidence IS NULL OR (transcript_confidence BETWEEN 0 AND 1)),

    -- ---- latency telemetry ---------------------------------------------
    CONSTRAINT ck_behaviour_signal_latencies
        CHECK (
                (classification_latency_ms IS NULL OR classification_latency_ms >= 0)
            AND (capture_latency_ms        IS NULL OR capture_latency_ms        >= 0)
        ),

    -- ---- geo -------------------------------------------------------------
    CONSTRAINT ck_behaviour_signal_geo_pair
        CHECK ((geo_lat IS NULL) = (geo_lon IS NULL)),
    CONSTRAINT ck_behaviour_signal_geo_range
        CHECK (
                (geo_lat IS NULL OR (geo_lat BETWEEN -90  AND 90))
            AND (geo_lon IS NULL OR (geo_lon BETWEEN -180 AND 180))
            AND (geo_accuracy_m IS NULL OR geo_accuracy_m >= 0)
        ),

    -- ---- misc ------------------------------------------------------------
    CONSTRAINT ck_behaviour_signal_not_self_duplicate
        CHECK (duplicate_of_id IS NULL OR duplicate_of_id <> id),

    -- ---- foreign keys ----------------------------------------------------
    CONSTRAINT fk_behaviour_signal_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenant (id),
    CONSTRAINT fk_behaviour_signal_author_user
        FOREIGN KEY (author_user_id) REFERENCES app_user (id),
    CONSTRAINT fk_behaviour_signal_guest_session
        FOREIGN KEY (guest_session_id, tenant_id) REFERENCES guest_session (id, tenant_id),
    CONSTRAINT fk_behaviour_signal_classification
        FOREIGN KEY (classification_code) REFERENCES classification (code),
    CONSTRAINT fk_behaviour_signal_pulse_session
        FOREIGN KEY (pulse_session_id, tenant_id) REFERENCES pulse_session (id, tenant_id),
    CONSTRAINT fk_behaviour_signal_qr_code
        FOREIGN KEY (qr_code_id, tenant_id) REFERENCES qr_code (id, tenant_id),
    CONSTRAINT fk_behaviour_signal_site
        FOREIGN KEY (site_id, tenant_id) REFERENCES site (id, tenant_id),
    CONSTRAINT fk_behaviour_signal_sub_site
        FOREIGN KEY (sub_site_id, tenant_id) REFERENCES sub_site (id, tenant_id),
    CONSTRAINT fk_behaviour_signal_asset
        FOREIGN KEY (asset_id, tenant_id) REFERENCES asset (id, tenant_id),
    CONSTRAINT fk_behaviour_signal_task_type
        FOREIGN KEY (task_type_code) REFERENCES task_type (code),
    CONSTRAINT fk_behaviour_signal_risk_type
        FOREIGN KEY (risk_type_code) REFERENCES risk_type (code)
);

ALTER TABLE behaviour_signal
    ADD CONSTRAINT uq_behaviour_signal_id_tenant UNIQUE (id, tenant_id);

-- Self-FK declared after the composite unique key exists.
ALTER TABLE behaviour_signal
    ADD CONSTRAINT fk_behaviour_signal_duplicate_of
    FOREIGN KEY (duplicate_of_id, tenant_id)
    REFERENCES behaviour_signal (id, tenant_id);

CREATE TRIGGER trg_behaviour_signal_updated_at
    BEFORE UPDATE ON behaviour_signal
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  behaviour_signal IS
    'The core object. Draft and final are the SAME ROW with a status column, not two tables -- splitting them would force a copy-and-delete on finalisation and break the signal_media FKs already attached during the draft phase (Architecture Sec 2.4). Zero mandatory fields at capture: a draft is insertable with tenant_id + author_token + status alone.';

COMMENT ON COLUMN behaviour_signal.id IS
    'Client-generated UUIDv7, minted on-device before the first network call, which is what makes POST /v1/signals/draft idempotent under retry. The gen_random_uuid() default is a fallback for server-side/admin inserts only.';
COMMENT ON COLUMN behaviour_signal.status IS
    'draft -> classified -> final, plus terminal discarded. Enforced here by CHECK, in the Signal facade by a transition guard, and on the wire by an optimistic UPDATE ... WHERE status = $expected. Three layers because a signal that regresses to draft mid-pilot is an unrecoverable data-integrity story. text + CHECK, never a PG ENUM.';
COMMENT ON COLUMN behaviour_signal.visibility IS
    'site | tenant | public. The column DEFAULT is ''site'' for every tenant, including Community -- there is no per-tenant default resolution in the schema. pol_community_public_read requires visibility = ''public'', so a Community capture left on the default will NOT appear on the unauthenticated Community feed: the application must set visibility = ''public'' explicitly when the capturing tenant is kind = ''community''. This is deliberate (fail closed, never leak), but it means the Community feed is empty until that write path exists. SCP-024: corporate content must never leak into the community feed, and this column plus pol_community_public_read is where that is enforced.';
COMMENT ON COLUMN behaviour_signal.author_token IS
    'ALWAYS populated, anonymous or not. Deterministic one-way per-user-per-tenant HMAC pseudonym (Architecture Sec 4.2). This is what keeps repeat usage (the primary success measure), rate limiting, abuse blocking and closure notification working on anonymous signals. The same person is a different token in the Community tenant than in their employer tenant, so a corporate admin cannot correlate the two.';
COMMENT ON COLUMN behaviour_signal.author_user_id IS
    'NULL when the signal is anonymous. This single nullable FK IS the Dev Pack Sec 7 "strip user metadata at the DB level" requirement, made real: for an anonymous signal there is no user metadata on the row to strip. Guarded by ck_behaviour_signal_anonymity so the anonymity promise is a database invariant, not an application convention.';
COMMENT ON COLUMN behaviour_signal.is_anonymous IS
    'Materialised at capture time from the account-level setting (PRD Sec 5.5). Deliberately NOT read live from app_user.default_anonymous: the account setting may be flipped later, but the promise made to the worker at the moment of capture must be immutable.';
COMMENT ON COLUMN behaviour_signal.guest_session_id IS
    'Set for unauthenticated QR journeys (WRK-003). When a guest later registers, guest_session.promoted_user_id attaches their prior activity without re-keying any signal.';
COMMENT ON COLUMN behaviour_signal.pulse_session_id IS
    'Links Echo -> Signal. NULL for feed-entry captures that skip PULSE entirely.';
COMMENT ON COLUMN behaviour_signal.entry_point IS
    '[SIGNAL] qr | direct | feed | notification. Nullable because capture must never block on it.';
COMMENT ON COLUMN behaviour_signal.classification_code IS
    'NULL while draft -- classification is a separate tap in the flow and must not be a mandatory field at row creation.';
COMMENT ON COLUMN behaviour_signal.classification_latency_ms IS
    '[SIGNAL] Client-measured milliseconds from the classification screen appearing to the tile being tapped. This is how the "<10s to classify" NFR is PROVEN AT UAT with real production data across every capture, instead of by stopwatch on a demo device. Backfill is impossible; drop this column and the NFR becomes an opinion.';
COMMENT ON COLUMN behaviour_signal.capture_latency_ms IS
    '[SIGNAL] Client-measured milliseconds from first tap to finalise. This is how the "<60s end-to-end capture" acceptance criterion is PROVEN AT UAT with real production data. Unreconstructable retrospectively, and it is the single number the pilot is judged on.';
COMMENT ON COLUMN behaviour_signal.body_text IS
    'Nullable. Zero mandatory fields at capture -- a photo and a classification is a complete, valuable signal.';
COMMENT ON COLUMN behaviour_signal.body_source IS
    'typed | voice_transcript | none. CQA-006 wants evidence that voice-first is actually used rather than merely offered; this column is that evidence.';
COMMENT ON COLUMN behaviour_signal.transcript_confidence IS
    '[SIGNAL] 0..1 ASR confidence for voice_transcript bodies. Lets a future pass identify text that should be treated as unreliable.';
COMMENT ON COLUMN behaviour_signal.site_id IS
    'Denormalised from the resolved context so the feed filter (WRK-013/014) is one index scan with no join. context_snapshot remains the historical truth.';
COMMENT ON COLUMN behaviour_signal.sub_site_id IS
    'Denormalised from the resolved context. Drives WRK-013 auto-filter to the worker''s current zone.';
COMMENT ON COLUMN behaviour_signal.asset_id IS
    'Denormalised from the resolved context. The supervisor insight the product is sold on -- "3 similar Be Aware signals in 2 weeks, all on custom lifting fixtures" -- is a GROUP BY on this column, which is why asset is a real entity and not free text.';
COMMENT ON COLUMN behaviour_signal.context_snapshot IS
    'Immutable denormalised copy of the resolved context at capture time, including qr_context.context_version. Never updated. Lets a six-month-old signal be interpreted against the context definition that was in force when it was captured.';
COMMENT ON COLUMN behaviour_signal.task_type_code IS
    '[SIGNAL] Structured, seeded vocabulary (heavy_lift, confined_space_entry, isolation, ...) copied from the QR context and FK-enforced against task_type. One of the two axes the future Identify/Gather pattern detection groups on -- deliberately NOT free text, because string matching would make the flagship analysis unreliable.';
COMMENT ON COLUMN behaviour_signal.risk_type_code IS
    '[SIGNAL] Structured, seeded vocabulary (suspended_load, confined_space, dropped_object, ...) copied from the QR context and FK-enforced against risk_type. The second pattern-detection axis.';
COMMENT ON COLUMN behaviour_signal.geo_lat IS
    'Optional, permission-gated. Rounded to 3 decimal places (~110 m) by the application before storage on anonymous signals: a precise fix on a specific work position identifies its author to anyone holding the crew roster, whatever is_anonymous says (Architecture Sec 4.3).';
COMMENT ON COLUMN behaviour_signal.occurred_at IS
    'When the observation happened. Defaults to capture time; a separate column because Phase 2 may allow backdating and retrofitting that distinction later is impossible.';
COMMENT ON COLUMN behaviour_signal.media_state IS
    'none | pending | partial | ready | failed. DENORMALISED from signal_media and maintained by the media worker so the feed decides what to render (thumbnail / skeleton / nothing) without a join or subquery -- one index scan per feed page (Architecture Sec 5.4). The feed never waits for media and never hides a signal because its media is not ready.';
COMMENT ON COLUMN behaviour_signal.moderation_state IS
    'visible | hidden | removed | under_review. First-ever submission from a token in the Community tenant starts under_review. removed is a moderation outcome, not a delete -- the row survives for audit.';
COMMENT ON COLUMN behaviour_signal.workflow_state IS
    'NULL until a review_task exists. Denormalised from review_task.state (open | acknowledged | closed) for feed badges. MVP supervisor workflow is Acknowledge + Close only (PRD Sec 5.4).';
COMMENT ON COLUMN behaviour_signal.search_vector IS
    'Generated STORED tsvector over body_text. A generated column may only reference columns of the same row and its expression must be IMMUTABLE, which is why the regconfig is the literal english cast rather than a search_path-dependent lookup. Context terms are deliberately NOT concatenated in: they live in FK columns that are already indexed, and pulling them in would need a non-immutable join.';
COMMENT ON COLUMN behaviour_signal.duplicate_of_id IS
    '[SIGNAL] Self-FK, tenant-composite. Dev Pack Sec 17.2 duplicate detection. MVP writes it only via an explicit moderator "mark duplicate" action; automated detection is Phase 2 against this same column.';
COMMENT ON COLUMN behaviour_signal.similarity_group_id IS
    '[SIGNAL] Pure placeholder for Phase-2 clustering. Costs one nullable column now and a full backfill that can never be done later.';
COMMENT ON COLUMN behaviour_signal.deleted_at IS
    'Soft delete (ADM-034). Never hard delete: GDPR erasure tombstones the user and destroys the token mapping, leaving the signal as genuinely anonymous safety knowledge (Architecture Sec 4.4).';

-- Indexes, per Architecture Sec 2.4.
-- The feed query. Partial on deleted_at IS NULL so soft-deleted rows cost
-- nothing in the hottest query in the product.
CREATE INDEX idx_behaviour_signal_feed
    ON behaviour_signal (tenant_id, status, visibility, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_behaviour_signal_tenant_site
    ON behaviour_signal (tenant_id, site_id, created_at DESC)
    WHERE deleted_at IS NULL;

-- WRK-013: auto-filter to the current sub-site, severity ("red first") sort.
CREATE INDEX idx_behaviour_signal_subsite_classification
    ON behaviour_signal (tenant_id, sub_site_id, classification_code, created_at DESC)
    WHERE deleted_at IS NULL;

-- Repeat-usage metric (COUNT(DISTINCT author_token)) and the rate-limit
-- window count. Intentionally NOT partial: rate limiting must see
-- discarded and soft-deleted rows or discarding becomes a spam bypass.
CREATE INDEX idx_behaviour_signal_author_token
    ON behaviour_signal (author_token, created_at DESC);

CREATE INDEX idx_behaviour_signal_search_vector
    ON behaviour_signal USING gin (search_vector);

CREATE INDEX idx_behaviour_signal_asset
    ON behaviour_signal (tenant_id, asset_id, created_at DESC)
    WHERE deleted_at IS NULL AND asset_id IS NOT NULL;

-- Supervisor queue: open/acknowledged work.
CREATE INDEX idx_behaviour_signal_workflow_state
    ON behaviour_signal (tenant_id, workflow_state, created_at DESC)
    WHERE workflow_state IS NOT NULL AND deleted_at IS NULL;

-- The 24h draft reaper (Architecture Sec 5.3).
CREATE INDEX idx_behaviour_signal_stale_drafts
    ON behaviour_signal (tenant_id, created_at)
    WHERE status IN ('draft', 'classified');

CREATE INDEX idx_behaviour_signal_pulse_session
    ON behaviour_signal (pulse_session_id)
    WHERE pulse_session_id IS NOT NULL;

-- [SIGNAL] Taxonomy rollups: "all suspended-load signals in this zone".
CREATE INDEX idx_behaviour_signal_taxonomy
    ON behaviour_signal (tenant_id, risk_type_code, task_type_code, created_at DESC)
    WHERE deleted_at IS NULL;


-- =====================================================================
-- 4. signal_media -- Architecture Sec 2.4 + Sec 5 (upload state machine)
-- =====================================================================

CREATE TABLE signal_media (
    id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id           uuid        NOT NULL,
    signal_id           uuid        NOT NULL,

    kind                text        NOT NULL,
    state               text        NOT NULL DEFAULT 'reserved',

    storage_key         text        NOT NULL,
    thumb_key           text        NULL,
    poster_key          text        NULL,

    mime_type           text        NULL,
    byte_size           bigint      NULL,
    width               integer     NULL,
    height              integer     NULL,
    duration_ms         integer     NULL,
    checksum_sha256     char(64)    NULL,

    upload_started_at   timestamptz NULL,
    upload_completed_at timestamptz NULL,
    processed_at        timestamptz NULL,

    attempt_count       integer     NOT NULL DEFAULT 0,
    last_error          text        NULL,

    exif_stripped       boolean     NOT NULL DEFAULT true,

    transcript_text     text        NULL,
    transcript_state    text        NOT NULL DEFAULT 'none',

    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz,
    deleted_at          timestamptz,

    CONSTRAINT pk_signal_media PRIMARY KEY (id),
    CONSTRAINT fk_signal_media_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenant (id),
    CONSTRAINT fk_signal_media_signal
        FOREIGN KEY (signal_id, tenant_id) REFERENCES behaviour_signal (id, tenant_id),

    CONSTRAINT ck_signal_media_kind
        CHECK (kind IN ('photo', 'video', 'audio')),
    CONSTRAINT ck_signal_media_state
        CHECK (state IN ('reserved', 'uploading', 'uploaded', 'processing', 'ready', 'failed', 'orphaned')),
    CONSTRAINT ck_signal_media_transcript_state
        CHECK (transcript_state IN ('none', 'pending', 'ready', 'failed')),

    -- Tenant-prefixed key so an S3 lifecycle / bulk-deletion policy can be
    -- scoped per tenant, and so a mis-keyed object is caught at write time.
    CONSTRAINT ck_signal_media_storage_key_tenant_prefixed
        CHECK (position(tenant_id::text in storage_key) > 0),

    -- EXIF (including GPS and device serial) is stripped server-side
    -- during derivative generation, UNCONDITIONALLY. A photo carrying the
    -- reporter's GPS fix defeats anonymity regardless of
    -- behaviour_signal.is_anonymous, so this is a database invariant and
    -- not a configurable behaviour: there is deliberately no way to
    -- record a stored derivative that kept its EXIF.
    CONSTRAINT ck_signal_media_exif_always_stripped
        CHECK (exif_stripped = true),

    -- NFR: video is length-capped at 30s at capture. Enforced here as
    -- well as client-side because the cap is what keeps the upload inside
    -- the 60s end-to-end budget on a quarry 3G link.
    CONSTRAINT ck_signal_media_video_duration
        CHECK (kind <> 'video' OR duration_ms IS NULL OR duration_ms <= 30000),

    CONSTRAINT ck_signal_media_dimensions
        CHECK (
                (byte_size   IS NULL OR byte_size   > 0)
            AND (width       IS NULL OR width       > 0)
            AND (height      IS NULL OR height      > 0)
            AND (duration_ms IS NULL OR duration_ms >= 0)
        ),
    CONSTRAINT ck_signal_media_attempt_count
        CHECK (attempt_count >= 0),
    CONSTRAINT ck_signal_media_checksum
        CHECK (checksum_sha256 IS NULL OR checksum_sha256 ~ '^[0-9a-f]{64}$'),
    CONSTRAINT ck_signal_media_upload_timing
        CHECK (upload_completed_at IS NULL OR upload_started_at IS NULL
               OR upload_completed_at >= upload_started_at)
);

CREATE TRIGGER trg_signal_media_updated_at
    BEFORE UPDATE ON signal_media
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  signal_media IS
    'One uploaded artefact per row. Bytes never traverse the API container: the browser PUTs directly to S3 via a presigned URL, so this row is created (state=reserved) before the object exists and is promoted asynchronously. The reconciler depends on the timing columns to close the "upload succeeded but /complete never arrived" hole (Architecture Sec 5.3).';
COMMENT ON COLUMN signal_media.id IS
    'Client-generated UUIDv7, minted alongside the signal id so that presign is idempotent under retry.';
COMMENT ON COLUMN signal_media.state IS
    'reserved -> uploading -> uploaded -> processing -> ready, with terminal failed and orphaned. orphaned means the reserved row has no object in S3 after the reconciler HEADed it, or the parent draft was reaped.';
COMMENT ON COLUMN signal_media.storage_key IS
    'Full object key, s3://bucket/{tenant_id}/{yyyy}/{mm}/{signal_id}/{media_id}.{ext}. Tenant-prefixed by constraint so retention and erasure can be executed as a prefix operation.';
COMMENT ON COLUMN signal_media.thumb_key IS
    'sharp-generated 400px derivative. NULL until the worker has processed the original.';
COMMENT ON COLUMN signal_media.poster_key IS
    'ffmpeg-extracted poster frame, video only.';
COMMENT ON COLUMN signal_media.width IS
    'Captured client-side BEFORE upload so the feed can reserve a correctly proportioned skeleton tile while the object is still in flight (Architecture Sec 5.4) -- a mis-sized placeholder that reflows on load reads as broken.';
COMMENT ON COLUMN signal_media.checksum_sha256 IS
    'Client-supplied lowercase hex SHA-256, verified against the stored object on finalise.';
COMMENT ON COLUMN signal_media.attempt_count IS
    'Incremented on each failed /complete or processing attempt. Feeds the 3-retry-then-failed policy; the signal itself stays visible and final when processing fails, because the observation is the value and the photo is supporting evidence.';
COMMENT ON COLUMN signal_media.exif_stripped IS
    'Always true, by CHECK. EXIF including GPS and device serial is stripped unconditionally during derivative generation. This column exists to make that fact auditable per object, not to make it optional.';
COMMENT ON COLUMN signal_media.transcript_text IS
    'Audio only. Transcription is non-blocking by construction (CQA-006: voice preferred, never required) -- a provider outage sets transcript_state=failed and nothing else changes.';
COMMENT ON COLUMN signal_media.deleted_at IS
    'Soft delete. Object deletion in S3 is a separate, audited retention job.';

CREATE INDEX idx_signal_media_signal
    ON signal_media (signal_id)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_signal_media_tenant_state
    ON signal_media (tenant_id, state, created_at DESC);

-- The 10-minute reconciler sweep (Architecture Sec 5.3).
CREATE INDEX idx_signal_media_pending_reconcile
    ON signal_media (created_at)
    WHERE state IN ('reserved', 'uploading', 'uploaded', 'processing');

CREATE UNIQUE INDEX uq_signal_media_storage_key
    ON signal_media (storage_key);


-- =====================================================================
-- 5. signal_classification_event -- [SIGNAL], APPEND-ONLY
--    No UPDATE or DELETE grant is issued to any runtime role (0007).
-- =====================================================================

CREATE TABLE signal_classification_event (
    id                uuid        NOT NULL DEFAULT gen_random_uuid(),
    tenant_id         uuid        NOT NULL,
    signal_id         uuid        NOT NULL,

    from_code         text        NULL,
    to_code           text        NOT NULL,
    changed_by_role   text        NULL,
    changed_by_token  char(32)    NULL,
    reason            text        NULL,
    source            text        NOT NULL,

    created_at        timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT pk_signal_classification_event PRIMARY KEY (id),
    CONSTRAINT fk_signal_classification_event_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenant (id),
    CONSTRAINT fk_signal_classification_event_signal
        FOREIGN KEY (signal_id, tenant_id) REFERENCES behaviour_signal (id, tenant_id),
    CONSTRAINT fk_signal_classification_event_from_code
        FOREIGN KEY (from_code) REFERENCES classification (code),
    CONSTRAINT fk_signal_classification_event_to_code
        FOREIGN KEY (to_code) REFERENCES classification (code),
    CONSTRAINT ck_signal_classification_event_source
        CHECK (source IN ('worker', 'moderator', 'admin')),
    CONSTRAINT ck_signal_classification_event_changed
        CHECK (from_code IS DISTINCT FROM to_code),
    CONSTRAINT ck_signal_classification_event_token_format
        CHECK (changed_by_token IS NULL OR changed_by_token ~ '^[0-9A-Z]{32}$')
);

COMMENT ON TABLE  signal_classification_event IS
    '[SIGNAL] Append-only log of every classification set or changed. Exists because ADM-033 permits an admin to change a worker''s classification and CQA-005 anticipates deeper SIF mapping later: the DISAGREEMENT between the worker who was standing there and the reviewer who was not IS training data, and it is irrecoverable if only the final value is kept. No UPDATE or DELETE grant is issued on this table.';
COMMENT ON COLUMN signal_classification_event.from_code IS
    'NULL on the first (worker) classification -- there was nothing to change from.';
COMMENT ON COLUMN signal_classification_event.changed_by_role IS
    'Role code at the time of the change (worker | supervisor | moderator | org_admin | platform_admin). Denormalised because roles change and this record must not.';
COMMENT ON COLUMN signal_classification_event.changed_by_token IS
    'author_token of the actor, never a user id -- a moderator who reclassifies an anonymous signal must not become the route by which the reporter is identified.';
COMMENT ON COLUMN signal_classification_event.source IS
    'worker | moderator | admin. Distinguishes a worker''s own correction from a third-party override, which is the axis the disagreement analysis runs on.';

CREATE INDEX idx_signal_classification_event_signal
    ON signal_classification_event (tenant_id, signal_id, created_at);

CREATE INDEX idx_signal_classification_event_disagreement
    ON signal_classification_event (tenant_id, from_code, to_code, created_at)
    WHERE from_code IS NOT NULL;


-- =====================================================================
-- 6. signal_read_state -- WRK-013 "You are caught up!" boundary
-- =====================================================================

CREATE TABLE signal_read_state (
    tenant_id     uuid        NOT NULL,
    author_token  char(32)    NOT NULL,
    signal_id     uuid        NOT NULL,
    seen_at       timestamptz NOT NULL DEFAULT now(),
    opened_at     timestamptz NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz,

    CONSTRAINT pk_signal_read_state PRIMARY KEY (author_token, signal_id),
    CONSTRAINT fk_signal_read_state_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenant (id),
    CONSTRAINT fk_signal_read_state_signal
        FOREIGN KEY (signal_id, tenant_id) REFERENCES behaviour_signal (id, tenant_id),
    CONSTRAINT ck_signal_read_state_author_token_format
        CHECK (author_token ~ '^[0-9A-Z]{32}$'),
    CONSTRAINT ck_signal_read_state_opened_at
        CHECK (opened_at IS NULL OR opened_at >= seen_at)
);

CREATE TRIGGER trg_signal_read_state_updated_at
    BEFORE UPDATE ON signal_read_state
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  signal_read_state IS
    'Per-reader read state. Powers WRK-013''s "You are caught up!" boundary in the feed. Deliberately has NO user_id column of any kind: it is keyed by author_token ONLY, so read state behaves identically for guests, anonymous users and attributed users, and destroying the token mapping at GDPR erasure clears attributability by construction. Composite PK (author_token, signal_id) -- one row per reader per signal, upserted on view.';
COMMENT ON COLUMN signal_read_state.author_token IS
    'The READER''s token, not the author''s. Guests carry a token too, which is the only reason guest read state works at all.';
COMMENT ON COLUMN signal_read_state.tenant_id IS
    'Present for RLS and for retention scoping; it is not part of the PK because a token is already tenant-scoped by derivation (per-tenant salt).';
COMMENT ON COLUMN signal_read_state.seen_at IS
    'Card scrolled into view. This is the value the "caught up" boundary is computed against.';
COMMENT ON COLUMN signal_read_state.opened_at IS
    'Card actually opened. NULL means seen but not read -- the difference between the two is the feed engagement metric.';

CREATE INDEX idx_signal_read_state_tenant_token
    ON signal_read_state (tenant_id, author_token, seen_at DESC);

CREATE INDEX idx_signal_read_state_signal
    ON signal_read_state (signal_id);


-- =====================================================================
-- 7. Row-Level Security -- Architecture Sec 3.3
--    ENABLED and FORCED on every tenant-scoped table in this migration.
--    classification is deliberately excluded: it is global reference data.
--
--    FORCE is set because the table owner would otherwise bypass RLS
--    implicitly; an accidental owner connection at runtime must not be a
--    cross-tenant read. WITH CHECK deliberately carries NO bypass clause:
--    even the cross-tenant outbox flusher cannot write a row into the
--    wrong tenant, only read across tenants.
-- =====================================================================

ALTER TABLE pulse_session               ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_session               FORCE  ROW LEVEL SECURITY;
ALTER TABLE behaviour_signal            ENABLE ROW LEVEL SECURITY;
ALTER TABLE behaviour_signal            FORCE  ROW LEVEL SECURITY;
ALTER TABLE signal_media                ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_media                FORCE  ROW LEVEL SECURITY;
ALTER TABLE signal_classification_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_classification_event FORCE  ROW LEVEL SECURITY;
ALTER TABLE signal_read_state           ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_read_state           FORCE  ROW LEVEL SECURITY;

CREATE POLICY pol_tenant_isolation_pulse_session ON pulse_session
    USING (
           current_setting('app.bypass_rls', true) = 'on'
        OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
    WITH CHECK (
        tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    );

CREATE POLICY pol_tenant_isolation_behaviour_signal ON behaviour_signal
    USING (
           current_setting('app.bypass_rls', true) = 'on'
        OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
    WITH CHECK (
        tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    );

-- The Community tenant is the one tenant whose feed is readable
-- unauthenticated (Architecture Sec 3.6). Scoped hard to final, visible,
-- public, non-deleted rows in the Community tenant only, so SCP-024
-- (corporate content must never leak to the community feed) holds even if
-- the application forgets a filter. Permissive policies OR together, so
-- this widens SELECT only, and only for those rows.
CREATE POLICY pol_community_public_read ON behaviour_signal
    FOR SELECT
    USING (
            visibility       = 'public'
        AND moderation_state = 'visible'
        AND status           = 'final'
        AND deleted_at IS NULL
        AND tenant_id = nullif(current_setting('app.community_tenant_id', true), '')::uuid
    );

CREATE POLICY pol_tenant_isolation_signal_media ON signal_media
    USING (
           current_setting('app.bypass_rls', true) = 'on'
        OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
    WITH CHECK (
        tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    );

CREATE POLICY pol_tenant_isolation_signal_classification_event ON signal_classification_event
    USING (
           current_setting('app.bypass_rls', true) = 'on'
        OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
    WITH CHECK (
        tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    );

CREATE POLICY pol_tenant_isolation_signal_read_state ON signal_read_state
    USING (
           current_setting('app.bypass_rls', true) = 'on'
        OR tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    )
    WITH CHECK (
        tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
    );

-- =====================================================================
-- End of migration 0005. Roles and grants: see 0007_rls_roles.sql.
-- =====================================================================
