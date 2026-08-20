/**
 * S3 key for a video's thumbnail: the video's own key plus a reserved suffix.
 *   videos/1/sess_x/clip.mp4  ->  videos/1/sess_x/clip.mp4.thumb.webp
 *
 * Appending (rather than replacing the filename with a fixed name) guarantees the
 * thumbnail key is a STRICT superstring of the source key and shares its unique
 * per-upload session segment — so it can never collide with the video's own key
 * (even if the client named the upload "thumb.webp") or with any other object.
 * That collision-safety is what makes regeneration a safe in-place overwrite.
 */
export function thumbnailKeyFor(s3Key: string): string {
  return `${s3Key}.thumb.webp`;
}

/**
 * ffmpeg args to extract ONE representative frame from `inPath` to `outPath`.
 * The `thumbnail` filter scans a batch of frames and picks a representative one,
 * which avoids the black/blank intro frame a naive first-frame grab would take.
 */
export function ffmpegThumbnailArgs(inPath: string, outPath: string): string[] {
  return [
    '-nostdin', // never block reading stdin
    '-loglevel',
    'error',
    '-i',
    inPath,
    '-vf',
    'thumbnail',
    '-frames:v',
    '1',
    '-f',
    'image2',
    '-y',
    outPath,
  ];
}
