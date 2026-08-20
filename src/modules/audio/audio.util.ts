/**
 * Allowed audio containers and the file extension we store each under. Codec
 * suffixes (e.g. ";codecs=opus") are stripped before matching. Shared by the
 * Audio-clip and Speech-to-Text flows (both take the same MediaRecorder output).
 */
const AUDIO_MIME_EXT: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/mp4': 'mp4',
  'audio/aac': 'm4a', // AAC is delivered in an mp4/m4a container by MediaRecorder
};

/** The base media type, without any ";codecs=…" suffix, lower-cased. */
export function baseMime(mime: string): string {
  return mime.split(';')[0].trim().toLowerCase();
}

export function isAllowedAudioMime(mime: string): boolean {
  return baseMime(mime) in AUDIO_MIME_EXT;
}

/** File extension for a supported audio mime, or null if unsupported. */
export function extForAudioMime(mime: string): string | null {
  return AUDIO_MIME_EXT[baseMime(mime)] ?? null;
}
