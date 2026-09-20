/**
 * Kysely schema types. Matches db/schema/*.sql (apply via schema.sql).
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

/** Org-wide only. Site jobs (worker / supervisor / site_manager) live on SiteRole. */
export type TenantRole = 'member' | 'tenant_admin';
export type SiteRole = 'worker' | 'supervisor' | 'site_manager';
export type AccessRoleKind = 'platform' | 'tenant' | 'site';
export type AccessRoleKey =
  | 'platform_admin'
  | TenantRole
  | SiteRole;

/** Permission grant key: resource.action (e.g. nav.queue, tasks.create). */
export type PermissionGrant = string;
/** @deprecated Use TenantRole or SiteRole. Kept as TenantRole for JWT `role`. */
export type Role = TenantRole;
export type TenantKind = 'community' | 'corporate';
export type TenantStatus = 'active' | 'inactive';
export type EchoRetention = '3_years' | '7_years' | '10_years' | 'indefinite';
export type MediaRetention = '1_year' | '2_years' | '5_years' | 'match_echo';
/** invited = created, waiting for first OTP; active after first successful OTP. */
export type AccountStatus = 'invited' | 'active' | 'suspended';

export interface AppUserTable extends AuditColumns {
  id: Generated<number>;
  email: string;
  first_name: Nullable<string>;
  last_name: Nullable<string>;
  phone: Nullable<string>;
  email_verified_at: Nullable<Date>;
  account_status: Generated<AccountStatus>;
  is_platform_admin: Generated<boolean>;
  last_signed_in_at: Nullable<Date>;
}

export interface TenantTable extends AuditColumns {
  id: Generated<number>;
  name: string;
  kind: Generated<TenantKind>;
  domain: Nullable<string>;
  status: Generated<TenantStatus>;
  echo_retention: Generated<EchoRetention>;
  media_retention: Generated<MediaRetention>;
}

export interface UserTenantMembershipTable extends AuditColumns {
  id: Generated<number>;
  user_id: number;
  tenant_id: number;
  role: Generated<TenantRole>;
}

export interface AuthTokenTable extends AuditColumns {
  id: Generated<number>;
  user_id: number;
  /** Email OTP only — no magic-link tokens. */
  kind: 'otp';
  token_hash: string;
  expires_at: Date;
  consumed_at: Nullable<Date>;
  attempt_count: Generated<number>;
}

export type SiteApprovalStatus = 'pending' | 'approved';

export interface SiteTable extends AuditColumns {
  id: Generated<number>;
  tenant_id: number;
  name: string;
  location: Nullable<string>;
  approval_status: Generated<SiteApprovalStatus>;
}

export interface RoleTable extends AuditColumns {
  id: Generated<number>;
  scope: AccessRoleKind;
  key: AccessRoleKey;
  name: string;
  description: Nullable<string>;
}

export interface UserSiteMembershipTable extends AuditColumns {
  id: Generated<number>;
  user_id: number;
  site_id: number;
  role_id: number;
}

export interface PermissionTable extends AuditColumns {
  id: Generated<number>;
  resource: string;
  action: string;
  description: string;
}

export interface RolePermissionTable extends AuditColumns {
  id: Generated<number>;
  role_id: number;
  permission_id: number;
}

export interface SpaceTable extends AuditColumns {
  id: Generated<number>;
  tenant_id: number;
  site_id: number;
  name: string;
  location: Nullable<string>;
  asset_type: Nullable<string>;
  task_type: Nullable<string>;
  qr_code: Nullable<string>;
  permit_required: Generated<boolean>;
  rescue_plan_required: Generated<boolean>;
  content_owner_user_id: Nullable<number>;
  owner_rule: Nullable<string>;
}

export type EnergyBand = 'high_energy' | 'standard';

export interface HazardCategoryTable extends AuditColumns {
  id: Generated<number>;
  name: string;
  energy_band: EnergyBand;
  sort_order: Generated<number>;
}

export interface SiteCategoryOwnerTable extends AuditColumns {
  id: Generated<number>;
  site_id: number;
  hazard_category_id: number;
  owner_user_id: number;
}

export type PrivacyRequestStatus = 'logged' | 'approved' | 'completed' | 'cancelled';

export interface TenantPrivacyRequestTable extends AuditColumns {
  id: Generated<number>;
  tenant_id: number;
  requested_by: Nullable<number>;
  status: Generated<PrivacyRequestStatus>;
  note: Nullable<string>;
}

export type DocumentType =
  | 'permit_to_work'
  | 'risk_assessment'
  | 'rescue_plan'
  | 'checklist'
  | 'standard'
  | 'toolbox_talk'
  | 'other';
export type DocumentStatus = 'draft' | 'approved';
export type PlacementScope = 'tenant' | 'site' | 'space' | 'work_task';

export interface DocumentTable extends AuditColumns {
  id: Generated<number>;
  tenant_id: Nullable<number>;
  title: string;
  doc_type: DocumentType;
  kind_label: Nullable<string>;
  reference: Nullable<string>;
  status: Generated<DocumentStatus>;
}

export interface DocumentRevisionTable extends AuditColumns {
  id: Generated<number>;
  document_id: number;
  revision: string;
  s3_key: string;
  mime_type: Nullable<string>;
  size_bytes: Nullable<number>;
  is_current: Generated<boolean>;
}

export interface DocumentPlacementTable extends AuditColumns {
  id: Generated<number>;
  document_id: number;
  scope_kind: PlacementScope;
  tenant_id: Nullable<number>;
  site_id: Nullable<number>;
  space_id: Nullable<number>;
  work_task_id: Nullable<number>;
  inherited: Generated<boolean>;
}

export type ContentKind = 'job_checklist' | 'learn_5' | 'uncover' | 'shift';
export type ContentStatus = 'draft' | 'published';
export type ContentPromptSource = 'library' | 'custom' | 'echo';

export interface ContentPackTable extends AuditColumns {
  id: Generated<number>;
  tenant_id: Nullable<number>;
  kind: ContentKind;
  title: string;
  category: Nullable<string>;
  duration_min: Nullable<number>;
  status: Generated<ContentStatus>;
  revision: Nullable<string>;
  published_at: Nullable<Date>;
}

export interface ContentPromptTable extends AuditColumns {
  id: Generated<number>;
  content_pack_id: number;
  sort_order: Generated<number>;
  body_text: string;
  is_critical: Generated<boolean>;
  is_mandatory: Generated<boolean>;
}

export interface ContentAssetTable extends AuditColumns {
  id: Generated<number>;
  content_pack_id: number;
  s3_key: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  duration_sec: Nullable<number>;
}

export type Learn5Kind = 'list' | 'visual_media';

export interface ContentPlacementTable extends AuditColumns {
  id: Generated<number>;
  content_pack_id: number;
  pack_kind: Generated<ContentKind>;
  scope_kind: 'space' | 'work_task';
  space_id: Nullable<number>;
  work_task_id: Nullable<number>;
  inherited: Generated<boolean>;
  learn5_kind: Nullable<Learn5Kind>;
}

export type WorkTaskStatus = 'active' | 'archived';

export interface WorkTaskTable extends AuditColumns {
  id: Generated<number>;
  tenant_id: number;
  site_id: Nullable<number>;
  space_id: Nullable<number>;
  reference: string;
  work_description: Nullable<string>;
  status: Generated<WorkTaskStatus>;
  permit_required: Generated<boolean>;
  permit_type: Nullable<string>;
  permit_number: Nullable<string>;
  permit_valid_until: Nullable<Date>;
  rams_document_id: Nullable<number>;
  rams_reference: Nullable<string>;
  ms_sop_number: Nullable<string>;
  lead_user_id: Nullable<number>;
  copied_from_task_id: Nullable<number>;
  is_template: Generated<boolean>;
  si5_task_code: Nullable<string>;
  activity: Nullable<string>;
  starts_at: Nullable<Date>;
  ends_at: Nullable<Date>;
  planned_days: Nullable<number>;
}

export interface WorkTaskCrewTable extends AuditColumns {
  id: Generated<number>;
  work_task_id: number;
  user_id: number;
}

export type Learn5MediaRowKind = 'required' | 'optional';

export interface WorkTaskContentPromptTable extends AuditColumns {
  id: Generated<number>;
  work_task_id: number;
  content_prompt_id: number;
  pack_kind: 'job_checklist' | 'learn_5';
  sort_order: Generated<number>;
  is_critical: Generated<boolean>;
  is_mandatory: Generated<boolean>;
  fail_missing_items: JSONColumnType<string[], string, string>;
  tied_checklist_prompt_id: Nullable<number>;
}

export interface WorkTaskPromptSettingTable extends AuditColumns {
  id: Generated<number>;
  work_task_id: number;
  content_placement_id: Nullable<number>;
  pack_kind: 'uncover' | 'shift';
  sort_order: Generated<number>;
  source: Generated<ContentPromptSource>;
  content_prompt_id: Nullable<number>;
  source_signal_id: Nullable<number>;
  body_text: string;
}

export interface WorkTaskLearn5MediaTable extends AuditColumns {
  id: Generated<number>;
  work_task_id: number;
  content_placement_id: Nullable<number>;
  content_asset_id: number;
  row_kind: Learn5MediaRowKind;
  sort_order: Generated<number>;
}

export type PulseSource = 'work_task' | 'observation';
export type PulseStatus =
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'stopped'
  | 'abandoned';
export type PulseStage =
  | 'pause'
  | 'uncover'
  | 'learn_5'
  | 'shift'
  | 'checklist'
  | 'echo';

export interface PulseTable extends AuditColumns {
  id: Generated<number>;
  tenant_id: number;
  site_id: Nullable<number>;
  space_id: Nullable<number>;
  work_task_id: Nullable<number>;
  worker_user_id: Nullable<number>;
  source: Generated<PulseSource>;
  trigger: Nullable<string>;
  status: Generated<PulseStatus>;
  current_stage: Nullable<PulseStage>;
  started_at: Generated<Date>;
  completed_at: Nullable<Date>;
  stopped_at: Nullable<Date>;
}

export type Classification =
  'good_practice' | 'be_aware' | 'needs_attention_now';
export type SignalStatus = 'open' | 'acknowledged' | 'closed';
export type WorkerVisibleStatus =
  | 'received'
  | 'viewed'
  | 'actioned'
  | 'closed'
  | 'held';
export type ClassificationSource = 'ai' | 'human';

export type PulseEventType =
  | 'started'
  | 'paused'
  | 'resumed'
  | 'completed'
  | 'skipped'
  | 'checked'
  | 'unchecked'
  | 'submitted'
  | 'stopped'
  | 'shared'
  | 'viewed'
  | 'acknowledged';
export type NotificationStatus =
  | 'pending'
  | 'sent'
  | 'acknowledged'
  | 'failed';

export interface PulseEventTable extends AuditColumns {
  id: Generated<number>;
  pulse_id: number;
  tenant_id: number;
  actor_user_id: Nullable<number>;
  stage: PulseStage;
  event_type: PulseEventType;
  content_pack_id: Nullable<number>;
  content_prompt_id: Nullable<number>;
  related_signal_id: Nullable<number>;
  reason_code: Nullable<string>;
  reason_text: Nullable<string>;
  notification_status: Nullable<NotificationStatus>;
  notification_sent_at: Nullable<Date>;
  payload: JSONColumnType<Record<string, unknown>, string, string>;
  captured_at: Generated<Date>;
  synced_at: Nullable<Date>;
}

export type PulseChecklistAnswer =
  | 'yes'
  | 'no'
  | 'not_applicable'
  | 'unchecked';

export interface PulseChecklistResponseTable extends AuditColumns {
  id: Generated<number>;
  pulse_id: number;
  content_pack_id: number;
  content_prompt_id: number;
  worker_user_id: Nullable<number>;
  answer: PulseChecklistAnswer;
  comment: Nullable<string>;
  viewed_at: Nullable<Date>;
  answered_at: Nullable<Date>;
}

export type PulseContentAcknowledgementState =
  | 'viewed'
  | 'acknowledged'
  | 'skipped';

export interface PulseContentAcknowledgementTable extends AuditColumns {
  id: Generated<number>;
  pulse_id: number;
  content_pack_id: number;
  content_prompt_id: Nullable<number>;
  worker_user_id: Nullable<number>;
  state: PulseContentAcknowledgementState;
  acknowledged_at: Nullable<Date>;
}

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
  echo_ref: Nullable<string>;
  title: Nullable<string>;
  ai_summary: Nullable<string>;
  transcript: Nullable<string>;
  source: Nullable<PulseSource>;
  pulse_stage: Nullable<PulseStage>;
  worker_visible_status: Generated<WorkerVisibleStatus>;
  site_id: Nullable<number>;
  space_id: Nullable<number>;
  work_task_id: Nullable<number>;
  pulse_id: Nullable<number>;
  hazard_category_id: Nullable<number>;
  assigned_to_user_id: Nullable<number>;
  assigned_at: Nullable<Date>;
  assigned_by: Nullable<number>;
  due_at: Nullable<Date>;
  viewed_at: Nullable<Date>;
  viewed_by: Nullable<number>;
  actioned_at: Nullable<Date>;
  actioned_by: Nullable<number>;
  captured_at: Nullable<Date>;
  synced_at: Nullable<Date>;
  geo_lat: Nullable<number>;
  geo_lng: Nullable<number>;
  title_edited_by: Nullable<number>;
  classification_source: Nullable<ClassificationSource>;
}

export interface SignalClassificationEventTable extends AuditColumns {
  id: Generated<number>;
  signal_id: number;
  classification: Classification;
  source: ClassificationSource;
  actor_user_id: Nullable<number>;
}

export type AckStage = 'received' | 'viewed' | 'actioned' | 'closed';

export interface SignalAcknowledgementTable extends AuditColumns {
  id: Generated<number>;
  signal_id: number;
  stage: AckStage;
  body_text: string;
  sent_at: Nullable<Date>;
  is_automatic: Generated<boolean>;
}

export type UploadStatus = 'in_progress' | 'completed';
export type ThumbnailStatus = 'pending' | 'ready' | 'failed';
export type PlaybackStatus = 'pending' | 'ready' | 'failed';

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
  size_bytes: number;
  chunk_size: number;
  chunk_count: number;
  next_chunk_number: Generated<number>;
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
  size_bytes: number;
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

export type SignalMediaKind = 'photo' | 'video' | 'voice' | 'after_photo';

export interface SignalMediaTable extends AuditColumns {
  id: Generated<number>;
  signal_id: number;
  kind: SignalMediaKind;
  sort_order: Generated<number>;
  caption: Nullable<string>;
  s3_key: Nullable<string>;
  mime_type: Nullable<string>;
  size_bytes: Nullable<number>;
  duration_sec: Nullable<number>;
  captured_at: Nullable<Date>;
  upload_session_id: Nullable<number>;
  audio_clip_id: Nullable<number>;
  transcription_job_id: Nullable<number>;
}

export type ChecklistOutcome = 'carried_on' | 'changed_plan' | 'stopped';

export interface ChecklistCompletionTable extends AuditColumns {
  id: Generated<number>;
  tenant_id: number;
  pulse_id: Nullable<number>;
  space_id: Nullable<number>;
  work_task_id: Nullable<number>;
  content_pack_id: Nullable<number>;
  worker_user_id: Nullable<number>;
  outcome: ChecklistOutcome;
  signal_id: Nullable<number>;
  completed_at: Generated<Date>;
}

export type RealtimeClientType = 'worker' | 'backoffice';
export type RealtimeConnectionStatus = 'connected' | 'disconnected';
export type RealtimeMessageDirection = 'outbound' | 'inbound';
export type RealtimeEventName =
  | 'echo.queue.updated'
  | 'pulse.status.updated'
  | 'notification.created'
  | 'signal.updated';

export interface RealtimeConnectionTable extends AuditColumns {
  id: Generated<number>;
  tenant_id: number;
  user_id: Nullable<number>;
  socket_id: string;
  namespace: Generated<string>;
  client_type: RealtimeClientType;
  status: Generated<RealtimeConnectionStatus>;
  site_ids: Generated<number[]>;
  user_agent: Nullable<string>;
  remote_address: Nullable<string>;
  connected_at: Generated<Date>;
  last_seen_at: Generated<Date>;
  disconnected_at: Nullable<Date>;
  disconnect_reason: Nullable<string>;
}

export interface RealtimeConnectionRoomTable extends AuditColumns {
  id: Generated<number>;
  connection_id: number;
  room_name: string;
}

export interface RealtimeMessageTable extends AuditColumns {
  id: Generated<number>;
  tenant_id: number;
  connection_id: Nullable<number>;
  direction: RealtimeMessageDirection;
  event_name: RealtimeEventName;
  room_name: Nullable<string>;
  target_user_id: Nullable<number>;
  pulse_id: Nullable<number>;
  signal_id: Nullable<number>;
  payload: JSONColumnType<Record<string, unknown>, string, string>;
  published_at: Generated<Date>;
}

export interface DB {
  app_user: AppUserTable;
  auth_token: AuthTokenTable;
  tenant: TenantTable;
  user_tenant_membership: UserTenantMembershipTable;
  site: SiteTable;
  role: RoleTable;
  user_site_membership: UserSiteMembershipTable;
  permission: PermissionTable;
  role_permission: RolePermissionTable;
  space: SpaceTable;
  hazard_category: HazardCategoryTable;
  site_category_owner: SiteCategoryOwnerTable;
  tenant_privacy_request: TenantPrivacyRequestTable;
  document: DocumentTable;
  document_revision: DocumentRevisionTable;
  document_placement: DocumentPlacementTable;
  content_pack: ContentPackTable;
  content_prompt: ContentPromptTable;
  content_asset: ContentAssetTable;
  content_placement: ContentPlacementTable;
  work_task: WorkTaskTable;
  work_task_crew: WorkTaskCrewTable;
  work_task_content_prompt: WorkTaskContentPromptTable;
  work_task_prompt_setting: WorkTaskPromptSettingTable;
  work_task_learn5_media: WorkTaskLearn5MediaTable;
  pulse: PulseTable;
  pulse_event: PulseEventTable;
  pulse_checklist_response: PulseChecklistResponseTable;
  pulse_content_acknowledgement: PulseContentAcknowledgementTable;
  signal: SignalTable;
  signal_classification_event: SignalClassificationEventTable;
  signal_acknowledgement: SignalAcknowledgementTable;
  upload_session: UploadSessionTable;
  audio_clip: AudioClipTable;
  transcription_job: TranscriptionJobTable;
  signal_media: SignalMediaTable;
  checklist_completion: ChecklistCompletionTable;
  realtime_connection: RealtimeConnectionTable;
  realtime_connection_room: RealtimeConnectionRoomTable;
  realtime_message: RealtimeMessageTable;
}

export type Database = DB;

export const COMMUNITY_TENANT_ID = 1;
