/**
 * Kysely schema types. Matches db/schema/schema.sql.
 *
 * Ids are sequential integers (JS `number`).
 *   Generated<T>  DB-assigned / has a default -> optional on insert.
 *   Nullable<T>   nullable column             -> optional on insert (=> NULL).
 */
import type { ColumnType, Generated, JSONColumnType } from 'kysely';

type Nullable<T> = ColumnType<
  T | null,
  T | null | undefined,
  T | null | undefined
>;

/** Audit columns present on every table. updated_at is trigger-maintained. */
interface AuditColumns {
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  created_by: Nullable<number>;
  updated_by: Nullable<number>;
}

export type Role = 'worker' | 'supervisor';
export type TenantKind = 'community' | 'corporate';

export interface AppUserTable extends AuditColumns {
  id: Generated<number>;
  email: string;
  first_name: Nullable<string>;
  last_name: Nullable<string>;
  email_verified_at: Nullable<Date>;
}

export interface TenantTable extends AuditColumns {
  id: Generated<number>;
  slug: string;
  name: string;
  kind: Generated<TenantKind>;
}

export interface UserTenantMembershipTable extends AuditColumns {
  id: Generated<number>;
  user_id: number;
  tenant_id: number;
  role: Generated<Role>;
}

export interface AuthTokenTable extends AuditColumns {
  id: Generated<number>;
  user_id: number;
  kind: 'otp' | 'magic_link';
  token_hash: string;
  expires_at: Date;
  consumed_at: Nullable<Date>;
  attempt_count: Generated<number>;
}

export type Classification =
  'good_practice' | 'be_aware' | 'needs_attention_now';
export type SignalStatus = 'open' | 'acknowledged' | 'closed';

export interface SignalTable extends AuditColumns {
  id: Generated<number>;
  tenant_id: number;
  author_user_id: number;
  classification: Classification;
  body_text: string;
  is_anonymous: Generated<boolean>;
  status: Generated<SignalStatus>;
  acknowledged_at: Nullable<Date>;
  acknowledged_by: Nullable<number>;
  closed_at: Nullable<Date>;
  closed_by: Nullable<number>;
  close_note: Nullable<string>;
}

export type UploadStatus = 'in_progress' | 'completed';
export type ThumbnailStatus = 'pending' | 'ready' | 'failed';
export type PlaybackStatus = 'pending' | 'ready' | 'failed';

/** One confirmed chunk: its 1-based number and the ETag S3 returned for it. */
export interface UploadPartRef {
  chunkNumber: number;
  eTag: string;
}

export interface UploadSessionTable extends AuditColumns {
  id: Generated<number>;
  session_token: string;
  tenant_id: number;
  s3_key: string;
  s3_upload_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number; // int8 -> number (see db.provider pg parser)
  chunk_size: number;
  chunk_count: number;
  next_chunk_number: Generated<number>;
  // jsonb: read back as a parsed array, written as a JSON string.
  parts: JSONColumnType<UploadPartRef[], string, string>;
  status: Generated<UploadStatus>;
  video_id: Nullable<string>;
  completed_at: Nullable<Date>;
  thumbnail_key: Nullable<string>;
  thumbnail_status: Generated<ThumbnailStatus>;
  thumbnail_attempts: Generated<number>;
  playback_key: Nullable<string>;
  playback_status: Generated<PlaybackStatus>;
  playback_attempts: Generated<number>;
}

export type AudioClipStatus = 'pending' | 'uploaded';

export interface AudioClipTable extends AuditColumns {
  id: Generated<number>;
  tenant_id: number;
  s3_key: string;
  mime_type: string;
  size_bytes: number; // int8 -> number (see db.provider pg parser)
  status: Generated<AudioClipStatus>;
  uploaded_at: Nullable<Date>;
}

export type TranscriptionStatus =
  'queued' | 'in_progress' | 'completed' | 'failed';

export interface TranscriptionJobTable extends AuditColumns {
  id: Generated<number>;
  tenant_id: number;
  job_name: string;
  s3_key: string;
  language: Nullable<string>;
  status: Generated<TranscriptionStatus>;
  transcript: Nullable<string>;
  failure_reason: Nullable<string>;
  completed_at: Nullable<Date>;
}

export interface DB {
  app_user: AppUserTable;
  auth_token: AuthTokenTable;
  tenant: TenantTable;
  user_tenant_membership: UserTenantMembershipTable;
  signal: SignalTable;
  upload_session: UploadSessionTable;
  audio_clip: AudioClipTable;
  transcription_job: TranscriptionJobTable;
}

/** Fixed id of the seeded Community tenant (first row in db/schema/schema.sql). */
export const COMMUNITY_TENANT_ID = 1;
