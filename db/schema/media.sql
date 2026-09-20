-- ---------------------------------------------------------------------
-- Video upload (chunked, direct-to-S3).
-- ---------------------------------------------------------------------

CREATE TABLE upload_session (
    id                 integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_token      text        NOT NULL UNIQUE,
    tenant_id          integer     NOT NULL REFERENCES tenant (id),
    s3_key             text        NOT NULL,
    s3_upload_id       text        NOT NULL,
    filename           text        NOT NULL,
    mime_type          text        NOT NULL,
    size_bytes         bigint      NOT NULL CHECK (size_bytes >= 0),
    chunk_size         integer     NOT NULL CHECK (chunk_size > 0),
    chunk_count        integer     NOT NULL CHECK (chunk_count > 0),
    next_chunk_number  integer     NOT NULL DEFAULT 1,
    parts              jsonb       NOT NULL DEFAULT '[]',
    status             text        NOT NULL DEFAULT 'in_progress'
                       CHECK (status IN ('in_progress', 'completed')),
    video_id           text,
    completed_at       timestamptz,
    thumbnail_key      text,
    thumbnail_status   text        NOT NULL DEFAULT 'pending'
                       CHECK (thumbnail_status IN ('pending', 'ready', 'failed')),
    thumbnail_attempts integer     NOT NULL DEFAULT 0,
    playback_key       text,
    playback_status    text        NOT NULL DEFAULT 'pending'
                       CHECK (playback_status IN ('pending', 'ready', 'failed')),
    playback_attempts  integer     NOT NULL DEFAULT 0,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    created_by         integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by         integer     REFERENCES app_user (id) ON DELETE SET NULL
);
CREATE INDEX idx_upload_session_tenant ON upload_session (tenant_id, created_at DESC);
CREATE INDEX idx_upload_session_thumb_pending ON upload_session (completed_at)
    WHERE status = 'completed' AND thumbnail_status = 'pending';
CREATE INDEX idx_upload_session_playback_pending ON upload_session (completed_at)
    WHERE status = 'completed' AND playback_status = 'pending';


CREATE TABLE audio_clip (
    id          integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id   integer     NOT NULL REFERENCES tenant (id),
    s3_key      text        NOT NULL UNIQUE,
    mime_type   text        NOT NULL,
    size_bytes  bigint      NOT NULL CHECK (size_bytes >= 0),
    status      text        NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'uploaded')),
    uploaded_at timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    created_by  integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by  integer     REFERENCES app_user (id) ON DELETE SET NULL
);
CREATE INDEX idx_audio_clip_tenant  ON audio_clip (tenant_id, created_at DESC);
CREATE INDEX idx_audio_clip_creator ON audio_clip (created_by, created_at DESC);


CREATE TABLE transcription_job (
    id             integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id      integer     NOT NULL REFERENCES tenant (id),
    job_name       text        NOT NULL UNIQUE,
    s3_key         text        NOT NULL,
    language       text,
    status         text        NOT NULL DEFAULT 'queued'
                   CHECK (status IN ('queued', 'in_progress', 'completed', 'failed')),
    transcript     text,
    failure_reason text,
    completed_at   timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    created_by     integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by     integer     REFERENCES app_user (id) ON DELETE SET NULL
);
CREATE INDEX idx_transcription_job_tenant  ON transcription_job (tenant_id, created_at DESC);
CREATE INDEX idx_transcription_job_creator ON transcription_job (created_by, created_at DESC);


-- Echo media: photos / video / voice (and optional after-photo on close).
CREATE TABLE signal_media (
    id                 integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    signal_id          integer     NOT NULL REFERENCES signal (id) ON DELETE CASCADE,
    kind               text        NOT NULL CHECK (kind IN ('photo', 'video', 'voice', 'after_photo')),
    sort_order         integer     NOT NULL DEFAULT 0,
    caption            text,
    s3_key             text,
    mime_type          text,
    size_bytes         bigint      CHECK (size_bytes IS NULL OR size_bytes >= 0),
    duration_sec       integer     CHECK (duration_sec IS NULL OR duration_sec >= 0),
    captured_at        timestamptz,
    upload_session_id  integer     REFERENCES upload_session (id) ON DELETE SET NULL,
    audio_clip_id      integer     REFERENCES audio_clip (id) ON DELETE SET NULL,
    transcription_job_id integer   REFERENCES transcription_job (id) ON DELETE SET NULL,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    created_by         integer     REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by         integer     REFERENCES app_user (id) ON DELETE SET NULL
);
CREATE INDEX idx_signal_media_signal ON signal_media (signal_id, sort_order);
