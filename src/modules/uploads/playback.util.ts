/**
 * S3 key for a video's streamable rendition: the video's own key plus a reserved
 * suffix.
 *   videos/1/sess_x/clip.webm  ->  videos/1/sess_x/clip.webm.play.mp4
 *
 * Appending (rather than replacing the name with a fixed one) makes the playback
 * key a STRICT superstring of the source key, sharing its unique per-upload
 * session segment — so it can never collide with the video's own key or any other
 * object, which makes re-transcoding a safe in-place overwrite.
 */
export function playbackKeyFor(s3Key: string): string {
  return `${s3Key}.play.mp4`;
}

/**
 * ffmpeg args to transcode `inPath` into a universally streamable MP4 at
 * `outPath`. The output is deliberately the lowest-common-denominator that plays
 * and seeks on EVERY browser and device:
 *   - H.264 video (`libx264`, `yuv420p`) + AAC audio  -> the only codec combo
 *     supported everywhere incl. Safari/iOS (raw WebM/VP9 is not);
 *   - `+faststart` moves the moov atom to the front  -> progressive playback and
 *     seeking start immediately over an HTTP Range request, without downloading
 *     the whole file;
 *   - capped to 1280px wide (height kept even for yuv420p) -> bounded size.
 * Single-rendition by design; an HLS/CMAF ABR ladder can be added later from the
 * same source without changing this contract. `threads` caps libx264's CPU use
 * so a background transcode can't starve the co-located API.
 */
export function ffmpegTranscodeArgs(
  inPath: string,
  outPath: string,
  threads: number,
): string[] {
  return [
    '-nostdin', // never block reading stdin
    '-loglevel',
    'error',
    '-i',
    inPath,
    '-threads',
    String(threads), // bound encoder CPU (protects the API); see caller config
    '-vf',
    // Cap width at 1280 AND force BOTH dimensions even — yuv420p/libx264 reject an
    // odd width and won't auto-round: -2 makes height even, trunc(w/2)*2 the width.
    // (A raw VP9/ProRes source can legally have an odd width <= 1280.)
    "scale='trunc(min(1280,iw)/2)*2':-2",
    '-c:v',
    'libx264',
    '-profile:v',
    'high',
    '-preset',
    'veryfast',
    '-crf',
    '23',
    '-pix_fmt',
    'yuv420p', // required for Safari/QuickTime compatibility
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-ac',
    '2',
    '-movflags',
    '+faststart', // moov atom at the front -> instant progressive streaming
    '-y',
    outPath,
  ];
}
