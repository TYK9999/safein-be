import { Generated } from 'kysely';

export interface UserTable {
  id: Generated<string>;
  email: string;
  name: string;
  created_at: Generated<Date>;
}

export type UploadStatus = 'initiated' | 'completed' | 'aborted';

export interface VideoUploadsTable {
  id: Generated<string>;
  video_id: string | null;
  key: string;
  upload_id: string;
  size: number;
  mime: string;
  duration_sec: number;
  status: UploadStatus;
  /** Publicly accessible URL set when the upload is completed. */
  location: string | null;
  completed_at: Date | null;
  created_at: Generated<Date>;
}

export type RiskType =
  | 'confined_space'
  | 'working_at_height'
  | 'hot_work'
  | 'electrical'
  | 'general';

export type DestinationType = 'pulse' | 'behaviour_signal' | 'rescue_plan';

export interface QrCodesTable {
  id: Generated<string>;

  site: string;

  asset: string;

  task_type: string;

  risk_type: RiskType;

  // PostgreSQL text[]
  destination_types: DestinationType[];

  active: Generated<boolean>;

  created_at: Generated<Date>;

  updated_at: Generated<Date>;
  context: string;
}
export interface Database {
  users: UserTable;
  video_uploads: VideoUploadsTable;
  qr_codes: QrCodesTable;
}
