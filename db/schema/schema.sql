-- =====================================================================
-- SafeIn5 -- complete schema (single file). Postgres 16.
--
-- This is the whole current schema as clean CREATE TABLEs (phases 1-5
-- consolidated: identity, signals, supervisor loop, anonymity, tenancy).
-- No migrations, no backfill -- drop the database and re-run this to reset.
--
--   dropdb safein && createdb safein
--   psql -U postgres -d safein -v ON_ERROR_STOP=1 -f db/schema/schema.sql
--
-- Ids are sequential integers (1, 2, 3, ...) via GENERATED ALWAYS AS IDENTITY.
-- The Community tenant is the first row inserted, so it always gets id = 1
-- (the app refers to it as COMMUNITY_TENANT_ID = 1).
--
-- Every table carries audit columns:
--   created_at  set on insert
--   updated_at  set on insert, bumped on every UPDATE by trg_*_updated_at
--   created_by  app_user id who created the row (NULL for system/self-service)
--   updated_by  app_user id who last updated the row (NULL until first update)
--
-- Scoping note: tenant isolation is enforced in the APPLICATION layer for
-- now (WHERE tenant_id = ...). DB-level RLS and cryptographic pseudonymity
-- (author_token) are later hardening steps; see docs/db/migrations/.
-- =====================================================================


-- Shared trigger: stamp updated_at = now() on every UPDATE. Defined once.
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

-- One row per person. Role is NOT here -- it is per-organisation, on the
-- membership below.
CREATE TABLE app_user (
    id                 integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- sequential id (1, 2, 3, ...)
    email              text        NOT NULL UNIQUE,   -- login identifier; one account per email
    first_name         text,                          -- person's given name (optional)
    last_name          text,                          -- person's family name (optional)
    email_verified_at  timestamptz,                   -- set when the email is confirmed via OTP/link; NULL = unverified
    created_at         timestamptz NOT NULL DEFAULT now(),  -- when the account was created
    updated_at         timestamptz NOT NULL DEFAULT now(),  -- last change; bumped by trigger
    created_by         integer     REFERENCES app_user (id) ON DELETE SET NULL,  -- who created this row (NULL = self sign-up)
    updated_by         integer     REFERENCES app_user (id) ON DELETE SET NULL   -- who last changed this row
);

-- Single-use login credentials: OTP codes and magic-link tokens.
-- Only the HASH is stored, never the code/token itself.
CREATE TABLE auth_token (
    id             integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- sequential id
    user_id        integer     NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,  -- the account this credential logs in
    kind           text        NOT NULL CHECK (kind IN ('otp', 'magic_link')),      -- which login method issued it
    token_hash     text        NOT NULL,   -- SHA-256 of the code/token; plaintext is never stored
    expires_at     timestamptz NOT NULL,   -- hard expiry after which it cannot be used
    consumed_at    timestamptz,            -- when used or superseded; NULL = still usable (single-use)
    attempt_count  integer     NOT NULL DEFAULT 0,  -- failed verify attempts, for brute-force lockout
    created_at     timestamptz NOT NULL DEFAULT now(),  -- when the code/token was issued
    updated_at     timestamptz NOT NULL DEFAULT now(),  -- last change; bumped by trigger
    created_by     integer     REFERENCES app_user (id) ON DELETE SET NULL,  -- who issued it (NULL = self-service login)
    updated_by     integer     REFERENCES app_user (id) ON DELETE SET NULL   -- who last changed it
);
CREATE INDEX idx_auth_token_user_id    ON auth_token (user_id);     -- reap/list a user's tokens
CREATE INDEX idx_auth_token_token_hash ON auth_token (token_hash);  -- look a token up on verify


-- ---------------------------------------------------------------------
-- Tenancy
-- ---------------------------------------------------------------------

-- Organisations. The Community org (id = 1) is what self-registration joins.
CREATE TABLE tenant (
    id          integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- sequential id (Community = 1)
    slug        text        NOT NULL UNIQUE,   -- URL/login-friendly unique key, e.g. "community"
    name        text        NOT NULL,          -- organisation display name
    kind        text        NOT NULL DEFAULT 'community'   -- community (open sign-up) | corporate (invite-only, later)
                CHECK (kind IN ('community', 'corporate')),
    created_at  timestamptz NOT NULL DEFAULT now(),  -- when the org was created
    updated_at  timestamptz NOT NULL DEFAULT now(),  -- last change; bumped by trigger
    created_by  integer     REFERENCES app_user (id) ON DELETE SET NULL,  -- who created the org (NULL = seeded)
    updated_by  integer     REFERENCES app_user (id) ON DELETE SET NULL   -- who last changed it
);

-- First tenant inserted -> id = 1. The app relies on this (COMMUNITY_TENANT_ID).
INSERT INTO tenant (slug, name, kind)
VALUES ('community', 'SafeIn5 Community', 'community');

-- Person x organisation. Role lives here (per-tenant): you can be a worker in
-- one org and a supervisor in another.
CREATE TABLE user_tenant_membership (
    id          integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- sequential id
    user_id     integer     NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,  -- the person
    tenant_id   integer     NOT NULL REFERENCES tenant (id),                      -- the organisation they belong to
    role        text        NOT NULL DEFAULT 'worker'   -- their role WITHIN this org: worker | supervisor
                CHECK (role IN ('worker', 'supervisor')),
    created_at  timestamptz NOT NULL DEFAULT now(),  -- when the person joined the org
    updated_at  timestamptz NOT NULL DEFAULT now(),  -- last change (e.g. role change); bumped by trigger
    created_by  integer     REFERENCES app_user (id) ON DELETE SET NULL,  -- who created the membership (self on sign-up)
    updated_by  integer     REFERENCES app_user (id) ON DELETE SET NULL,  -- who last changed it (e.g. promoted to supervisor)
    UNIQUE (user_id, tenant_id)   -- one membership per person per organisation
);
CREATE INDEX idx_membership_user   ON user_tenant_membership (user_id);    -- "which orgs is this person in"
CREATE INDEX idx_membership_tenant ON user_tenant_membership (tenant_id);  -- "who is in this org"


-- ---------------------------------------------------------------------
-- Behaviour signals (capture, feed, supervisor loop, anonymity)
-- ---------------------------------------------------------------------

-- One safety observation. Scoped to a tenant; attributed to its author unless
-- is_anonymous (display-level: author_user_id is still stored). Status runs
-- open -> acknowledged -> closed via the supervisor loop.
CREATE TABLE signal (
    id               integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- sequential id
    tenant_id        integer     NOT NULL REFERENCES tenant (id),        -- owning org; drives all access scoping
    author_user_id   integer     NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,  -- who reported it (kept even if anonymous)
    classification   text        NOT NULL   -- reporter's category: good_practice | be_aware | needs_attention_now
                     CHECK (classification IN ('good_practice', 'be_aware', 'needs_attention_now')),
    body_text        text        NOT NULL,          -- free-text description of what was observed
    is_anonymous     boolean     NOT NULL DEFAULT false,  -- when true, the author is hidden in API responses
    status           text        NOT NULL DEFAULT 'open'  -- workflow state: open | acknowledged | closed
                     CHECK (status IN ('open', 'acknowledged', 'closed')),
    acknowledged_at  timestamptz,                   -- when a supervisor acknowledged it; NULL until then
    acknowledged_by  integer     REFERENCES app_user (id),  -- the supervisor who acknowledged
    closed_at        timestamptz,                   -- when it was closed; NULL until then
    closed_by        integer     REFERENCES app_user (id),  -- the supervisor who closed it
    close_note       text,                          -- supervisor's note on what was done (required to close)
    created_at       timestamptz NOT NULL DEFAULT now(),  -- when the report was captured
    updated_at       timestamptz NOT NULL DEFAULT now(),  -- last change; bumped by trigger
    created_by       integer     REFERENCES app_user (id) ON DELETE SET NULL,  -- who created it (= the author)
    updated_by       integer     REFERENCES app_user (id) ON DELETE SET NULL   -- who last changed it (e.g. the supervisor)
);

-- Feed: this tenant's signals, newest first (optionally filtered by status).
CREATE INDEX idx_signal_tenant_created ON signal (tenant_id, created_at DESC);
CREATE INDEX idx_signal_tenant_status  ON signal (tenant_id, status, created_at DESC);
-- "My signals": a user's own, newest first.
CREATE INDEX idx_signal_author         ON signal (author_user_id, created_at DESC);


-- ---------------------------------------------------------------------
-- Video upload (chunked, direct-to-S3). The client uploads each chunk DIRECTLY
-- to S3 via a presigned UploadPart URL — the backend never sees the bytes. One
-- endpoint (POST /uploads/next) drives a strict lockstep S3 Multipart Upload:
-- the first call runs CreateMultipartUpload + presigns chunk 1; each later call
-- confirms the previous chunk's S3 ETag and presigns the next; the final call
-- runs CompleteMultipartUpload. See docs/md/BACKEND_UPLOAD_SPEC.md.
--
-- session_token is the opaque, unguessable "sessionId" the client echoes on
-- every call (the capability for anonymous uploads). Abandoned uploads are
-- reclaimed solely by the S3 lifecycle rule (AbortIncompleteMultipartUpload) —
-- there is no server-side reaper and no abort endpoint.
-- ---------------------------------------------------------------------

CREATE TABLE upload_session (
    id                 integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- internal sequential id
    session_token      text        NOT NULL UNIQUE,   -- opaque "sessionId" echoed by the client (capability)
    tenant_id          integer     NOT NULL REFERENCES tenant (id),  -- owning org; scopes access (anonymous -> Community)
    s3_key             text        NOT NULL,   -- object key WE chose (never client-supplied)
    s3_upload_id       text        NOT NULL,   -- UploadId from S3 CreateMultipartUpload
    filename           text        NOT NULL,   -- client-declared original name (display only)
    mime_type          text        NOT NULL,   -- validated video/* type
    size_bytes         bigint      NOT NULL CHECK (size_bytes >= 0),   -- client-declared total size
    chunk_size         integer     NOT NULL CHECK (chunk_size > 0),    -- bytes per chunk (>= 5 MiB except the last)
    chunk_count        integer     NOT NULL CHECK (chunk_count > 0),   -- ceil(size / chunk_size)
    next_chunk_number  integer     NOT NULL DEFAULT 1,  -- the chunk currently awaiting confirmation
    parts              jsonb       NOT NULL DEFAULT '[]',  -- confirmed parts: [{ chunkNumber, eTag }, ...]
    status             text        NOT NULL DEFAULT 'in_progress'  -- in_progress -> completed
                       CHECK (status IN ('in_progress', 'completed')),
    video_id           text,       -- stable id of the stored video; minted when the last chunk is
                                   -- staged (a non-null value on an in_progress row = finalization pending)
    completed_at       timestamptz,            -- when CompleteMultipartUpload succeeded
    -- Poster-frame thumbnail, generated in the background after completion (ffmpeg
    -- -> WebP, stored beside the video). pending -> ready | failed.
    thumbnail_key      text,       -- S3 key of the generated thumbnail (NULL until ready)
    thumbnail_status   text        NOT NULL DEFAULT 'pending'
                       CHECK (thumbnail_status IN ('pending', 'ready', 'failed')),
    thumbnail_attempts integer     NOT NULL DEFAULT 0,  -- failed generation attempts (gives up at a cap)
    -- Streamable rendition: a web-friendly H.264/AAC MP4 with +faststart, transcoded
    -- in the background after completion so it plays and seeks on ALL browsers and
    -- devices (a raw upload may be WebM — no iOS/Safari support — or a non-faststart
    -- MP4). The original is kept as the master. pending -> ready | failed.
    playback_key       text,       -- S3 key of the transcoded MP4 (NULL until ready)
    playback_status    text        NOT NULL DEFAULT 'pending'
                       CHECK (playback_status IN ('pending', 'ready', 'failed')),
    playback_attempts  integer     NOT NULL DEFAULT 0,  -- failed transcode attempts (gives up at a cap)
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),  -- bumped by trigger
    created_by         integer     REFERENCES app_user (id) ON DELETE SET NULL,  -- the uploader (NULL = anonymous)
    updated_by         integer     REFERENCES app_user (id) ON DELETE SET NULL
);
CREATE INDEX idx_upload_session_tenant ON upload_session (tenant_id, created_at DESC);
-- Work queue for the thumbnail sweep: completed videos still awaiting a thumbnail.
-- Partial index stays tiny (only rows needing work are ever indexed).
CREATE INDEX idx_upload_session_thumb_pending ON upload_session (completed_at)
    WHERE status = 'completed' AND thumbnail_status = 'pending';
-- Work queue for the playback (transcode) sweep: completed videos still awaiting
-- a streamable rendition. Partial index stays tiny (only rows needing work).
CREATE INDEX idx_upload_session_playback_pending ON upload_session (completed_at)
    WHERE status = 'completed' AND playback_status = 'pending';


-- ---------------------------------------------------------------------
-- Audio clips (direct-to-S3, single presigned PUT — no chunking). A row is
-- written when the URL is presigned (status 'pending'); because the client PUTs
-- the bytes straight to S3, the only way the backend learns the upload finished
-- is the client calling POST /audio-clips/confirm, which HeadObjects the object
-- and flips the row to 'uploaded' (recording the real byte size). Clips are
-- retained permanently. See docs/../BACKEND_AUDIO_UPLOAD_SPEC.md.
-- ---------------------------------------------------------------------
CREATE TABLE audio_clip (
    id          integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- sequential id
    tenant_id   integer     NOT NULL REFERENCES tenant (id),  -- owning org (anonymous -> Community)
    s3_key      text        NOT NULL UNIQUE,   -- object key WE chose (never client-supplied)
    mime_type   text        NOT NULL,          -- validated audio/* type
    size_bytes  bigint      NOT NULL CHECK (size_bytes >= 0),  -- declared at presign; corrected to the real size on confirm
    status      text        NOT NULL DEFAULT 'pending'  -- pending -> uploaded (confirmed present in S3)
                CHECK (status IN ('pending', 'uploaded')),
    uploaded_at timestamptz,            -- when confirm verified the object in S3; NULL until then
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),  -- bumped by trigger
    created_by  integer     REFERENCES app_user (id) ON DELETE SET NULL,  -- the uploader (NULL = anonymous)
    updated_by  integer     REFERENCES app_user (id) ON DELETE SET NULL
);
CREATE INDEX idx_audio_clip_tenant  ON audio_clip (tenant_id, created_at DESC);   -- tenant history feed
CREATE INDEX idx_audio_clip_creator ON audio_clip (created_by, created_at DESC);  -- "my clips"


-- ---------------------------------------------------------------------
-- Transcription jobs (AWS Transcribe). A row is written when the job is started
-- (status 'queued'); polling GET /stt/jobs/:jobId advances it as AWS progresses
-- and stores the flattened transcript once complete, so history is queryable
-- without going back to S3/AWS. job_name is the AWS TranscriptionJobName WE mint,
-- and also the opaque handle the client polls with (its "jobId" capability).
-- See docs/../BACKEND_SPEECH_TO_TEXT_SPEC.md.
-- ---------------------------------------------------------------------
CREATE TABLE transcription_job (
    id             integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- sequential id
    tenant_id      integer     NOT NULL REFERENCES tenant (id),  -- owning org (anonymous -> Community)
    job_name       text        NOT NULL UNIQUE,   -- AWS TranscriptionJobName = the client's jobId (capability)
    s3_key         text        NOT NULL,          -- the transcribe-clips/... input object
    language       text,                          -- resolved LanguageCode; NULL = auto-detect (IdentifyLanguage)
    status         text        NOT NULL DEFAULT 'queued'  -- queued -> in_progress -> completed | failed
                   CHECK (status IN ('queued', 'in_progress', 'completed', 'failed')),
    transcript     text,                          -- flattened transcript text; set when completed
    failure_reason text,                          -- AWS FailureReason; set when failed
    completed_at   timestamptz,                   -- when it reached a terminal state; NULL until then
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),  -- bumped by trigger
    created_by     integer     REFERENCES app_user (id) ON DELETE SET NULL,  -- who started it (NULL = anonymous)
    updated_by     integer     REFERENCES app_user (id) ON DELETE SET NULL
);
CREATE INDEX idx_transcription_job_tenant  ON transcription_job (tenant_id, created_at DESC);
CREATE INDEX idx_transcription_job_creator ON transcription_job (created_by, created_at DESC);


-- ---------------------------------------------------------------------
-- updated_at triggers (bump updated_at on every UPDATE)
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_app_user_updated_at               BEFORE UPDATE ON app_user
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_auth_token_updated_at             BEFORE UPDATE ON auth_token
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tenant_updated_at                 BEFORE UPDATE ON tenant
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_user_tenant_membership_updated_at BEFORE UPDATE ON user_tenant_membership
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_signal_updated_at                 BEFORE UPDATE ON signal
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_upload_session_updated_at         BEFORE UPDATE ON upload_session
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_audio_clip_updated_at             BEFORE UPDATE ON audio_clip
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_transcription_job_updated_at      BEFORE UPDATE ON transcription_job
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
