import { ffmpegThumbnailArgs, thumbnailKeyFor } from '../thumbnail.util';

describe('thumbnailKeyFor', () => {
  it('appends the reserved suffix to the video key', () => {
    expect(thumbnailKeyFor('videos/1/sess_x/clip.mp4')).toBe(
      'videos/1/sess_x/clip.mp4.thumb.webp',
    );
  });

  it('is deterministic (idempotent overwrite)', () => {
    const k = 'videos/2/sess_y/a.b.c.mov';
    expect(thumbnailKeyFor(k)).toBe(thumbnailKeyFor(k));
  });

  it('NEVER equals the source key — even when the upload is named thumb.webp', () => {
    // The data-loss trap: a fixed sibling name would collide with a video whose
    // own filename is that name. The appended suffix makes collision impossible.
    for (const k of [
      'videos/1/sess_x/clip.mp4',
      'videos/1/sess_x/thumb.webp',
      'videos/1/sess_x/thumb.webp.thumb.webp',
      'thumb.webp',
    ]) {
      expect(thumbnailKeyFor(k)).not.toBe(k);
      expect(thumbnailKeyFor(k).startsWith(k)).toBe(true);
    }
  });
});

describe('ffmpegThumbnailArgs', () => {
  const args = ffmpegThumbnailArgs('/tmp/in.mp4', '/tmp/frame.png');

  it('reads the input and writes exactly one representative frame', () => {
    expect(args).toEqual(
      expect.arrayContaining(['-i', '/tmp/in.mp4', '-vf', 'thumbnail']),
    );
    // one frame only
    const i = args.indexOf('-frames:v');
    expect(i).toBeGreaterThan(-1);
    expect(args[i + 1]).toBe('1');
    // output path is last
    expect(args[args.length - 1]).toBe('/tmp/frame.png');
  });

  it('does not read stdin', () => {
    expect(args).toContain('-nostdin');
  });
});
