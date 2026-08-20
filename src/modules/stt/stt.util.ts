/** The transcription job states the API exposes (a subset mapped from AWS). */
export type SttStatus = 'queued' | 'in_progress' | 'completed' | 'failed';

// Our stored key extension -> AWS Transcribe MediaFormat value.
const EXT_MEDIA_FORMAT: Record<string, string> = {
  webm: 'webm',
  mp4: 'mp4',
  m4a: 'm4a',
};

/** AWS MediaFormat inferred from the object key's extension, or null. */
export function mediaFormatFromKey(s3Key: string): string | null {
  const dot = s3Key.lastIndexOf('.');
  const ext = dot >= 0 ? s3Key.slice(dot + 1).toLowerCase() : '';
  return EXT_MEDIA_FORMAT[ext] ?? null;
}

/** Map AWS `TranscriptionJobStatus` to our status; unknown => still running. */
export function sttStatusFromAws(awsStatus: string | undefined): SttStatus {
  switch (awsStatus) {
    case 'QUEUED':
      return 'queued';
    case 'COMPLETED':
      return 'completed';
    case 'FAILED':
      return 'failed';
    case 'IN_PROGRESS':
      return 'in_progress';
    default:
      // Unknown/undefined -> treat as non-terminal so the client keeps polling.
      return 'in_progress';
  }
}

/**
 * Flatten AWS Transcribe's transcript JSON to plain text
 * (`results.transcripts[0].transcript`). Defensive against any shape drift.
 */
export function flattenTranscript(json: unknown): string {
  if (typeof json !== 'object' || json === null) return '';
  const results = (json as { results?: unknown }).results;
  if (typeof results !== 'object' || results === null) return '';
  const transcripts = (results as { transcripts?: unknown }).transcripts;
  if (!Array.isArray(transcripts) || transcripts.length === 0) return '';
  const first = transcripts[0] as { transcript?: unknown };
  return typeof first.transcript === 'string' ? first.transcript : '';
}
