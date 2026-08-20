import { ffmpegTranscodeArgs, playbackKeyFor } from '../playback.util';

describe('playbackKeyFor', () => {
  it('appends the reserved suffix to the video key', () => {
    expect(playbackKeyFor('videos/1/sess_x/clip.webm')).toBe(
      'videos/1/sess_x/clip.webm.play.mp4',
    );
  });

  it('is deterministic (idempotent overwrite)', () => {
    const k = 'videos/2/sess_y/a.b.c.mov';
    expect(playbackKeyFor(k)).toBe(playbackKeyFor(k));
  });

  it('NEVER equals the source key — even when the upload is named play.mp4', () => {
    for (const k of [
      'videos/1/sess_x/clip.mp4',
      'videos/1/sess_x/clip.webm',
      'videos/1/sess_x/play.mp4',
      'videos/1/sess_x/clip.mp4.play.mp4',
      'play.mp4',
    ]) {
      expect(playbackKeyFor(k)).not.toBe(k);
      expect(playbackKeyFor(k).startsWith(k)).toBe(true);
    }
  });
});

describe('ffmpegTranscodeArgs', () => {
  const args = ffmpegTranscodeArgs('/tmp/in', '/tmp/out.mp4', 2);

  it('reads the input and writes to the output path last', () => {
    expect(args).toEqual(expect.arrayContaining(['-i', '/tmp/in']));
    expect(args[args.length - 1]).toBe('/tmp/out.mp4');
  });

  it('produces the universal H.264/AAC codec combo', () => {
    const at = (flag: string) => args[args.indexOf(flag) + 1];
    expect(at('-c:v')).toBe('libx264');
    expect(at('-c:a')).toBe('aac');
    // yuv420p is required for Safari/QuickTime.
    expect(at('-pix_fmt')).toBe('yuv420p');
  });

  it('enables +faststart so playback/seek start without a full download', () => {
    expect(args[args.indexOf('-movflags') + 1]).toBe('+faststart');
  });

  it('caps width at 1280 AND forces it EVEN (yuv420p rejects odd width)', () => {
    // trunc(min(1280,iw)/2)*2 => even width; -2 => even height.
    expect(args[args.indexOf('-vf') + 1]).toBe(
      "scale='trunc(min(1280,iw)/2)*2':-2",
    );
  });

  it('passes through the CPU thread cap', () => {
    expect(args[args.indexOf('-threads') + 1]).toBe('2');
  });

  it('does not read stdin', () => {
    expect(args).toContain('-nostdin');
  });
});
