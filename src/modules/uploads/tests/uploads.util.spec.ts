import {
  baseMime,
  extForVideoMime,
  isAllowedVideoMime,
} from '../uploads.util';

describe('uploads mime helpers', () => {
  it('strips MediaRecorder codec parameters', () => {
    expect(baseMime('video/webm;codecs=vp9,opus')).toBe('video/webm');
    expect(baseMime('video/webm;codecs=vp8,vorbis')).toBe('video/webm');
    expect(baseMime(' video/mp4 ')).toBe('video/mp4');
  });

  it('accepts video/webm with codecs (browser MediaRecorder)', () => {
    expect(isAllowedVideoMime('video/webm;codecs=vp9,opus')).toBe(true);
    expect(isAllowedVideoMime('video/webm;codecs=vp8,opus')).toBe(true);
    expect(isAllowedVideoMime('video/webm')).toBe(true);
  });

  it('rejects non-video or unknown containers', () => {
    expect(isAllowedVideoMime('audio/webm;codecs=opus')).toBe(false);
    expect(isAllowedVideoMime('application/octet-stream')).toBe(false);
    expect(isAllowedVideoMime('image/jpeg')).toBe(false);
  });

  it('maps mime to stored extension', () => {
    expect(extForVideoMime('video/webm;codecs=vp9,opus')).toBe('webm');
    expect(extForVideoMime('video/mp4')).toBe('mp4');
    expect(extForVideoMime('video/quicktime')).toBe('mov');
  });
});
