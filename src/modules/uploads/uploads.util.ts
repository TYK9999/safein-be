/**
 * Allowed video containers for POST /uploads/next. Codec parameters from
 * MediaRecorder (e.g. ";codecs=vp9,opus") are stripped before matching —
 * same approach as audio.util baseMime.
 */
const VIDEO_MIME_EXT: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/x-matroska': 'mkv',
  'video/ogg': 'ogv',
  'video/mpeg': 'mpeg',
  'video/3gpp': '3gp',
};

/** Base media type without ";codecs=…" (or other parameters), lower-cased. */
export function baseMime(mime: string): string {
  return mime.split(';')[0].trim().toLowerCase();
}

export function isAllowedVideoMime(mime: string): boolean {
  return baseMime(mime) in VIDEO_MIME_EXT;
}

/** File extension for a supported video mime, or null if unsupported. */
export function extForVideoMime(mime: string): string | null {
  return VIDEO_MIME_EXT[baseMime(mime)] ?? null;
}
