import { AudioPresignSchema } from '../audio.schema';
import { baseMime, extForAudioMime, isAllowedAudioMime } from '../audio.util';

describe('audio mime helpers', () => {
  it('strips the codec suffix and lower-cases', () => {
    expect(baseMime('audio/webm;codecs=opus')).toBe('audio/webm');
    expect(baseMime('AUDIO/MP4')).toBe('audio/mp4');
  });

  it('accepts the supported audio types (with or without codec suffix)', () => {
    for (const m of [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/mp4',
      'audio/aac',
    ]) {
      expect(isAllowedAudioMime(m)).toBe(true);
    }
  });

  it('rejects non-audio / unsupported types', () => {
    for (const m of [
      'video/mp4',
      'audio/ogg',
      'text/plain',
      'application/json',
    ]) {
      expect(isAllowedAudioMime(m)).toBe(false);
      expect(extForAudioMime(m)).toBeNull();
    }
  });

  it('maps mime -> stored extension', () => {
    expect(extForAudioMime('audio/webm;codecs=opus')).toBe('webm');
    expect(extForAudioMime('audio/mp4')).toBe('mp4');
    expect(extForAudioMime('audio/aac')).toBe('m4a');
  });
});

describe('AudioPresignSchema', () => {
  it('accepts a valid request; filename optional', () => {
    expect(
      AudioPresignSchema.parse({
        mime: 'audio/webm;codecs=opus',
        size: 214532,
      }),
    ).toEqual({ mime: 'audio/webm;codecs=opus', size: 214532 });
  });

  it('rejects a non-positive / non-integer size and a missing mime', () => {
    expect(
      AudioPresignSchema.safeParse({ mime: 'audio/webm', size: 0 }).success,
    ).toBe(false);
    expect(
      AudioPresignSchema.safeParse({ mime: 'audio/webm', size: 1.5 }).success,
    ).toBe(false);
    expect(AudioPresignSchema.safeParse({ size: 100 }).success).toBe(false);
  });
});
