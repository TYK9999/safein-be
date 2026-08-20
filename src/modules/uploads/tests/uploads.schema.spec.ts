import { UploadNextSchema } from '../uploads.schema';

describe('UploadNextSchema', () => {
  it('accepts a first-call body (no sessionId)', () => {
    const parsed = UploadNextSchema.parse({
      filename: 'clip.webm',
      mime: 'video/webm',
      size: 18874368,
      chunkSize: 6291456,
      chunkCount: 3,
    });
    expect(parsed.sessionId).toBeUndefined();
    expect(parsed.chunkCount).toBe(3);
  });

  it('accepts a confirm body', () => {
    const parsed = UploadNextSchema.parse({
      sessionId: 'sess_abc123',
      chunkNumber: 1,
      eTag: '"d41d8cd98f00b204e9800998ecf8427e"',
    });
    expect(parsed.sessionId).toBe('sess_abc123');
    expect(parsed.chunkNumber).toBe(1);
  });

  it('accepts a resume confirm (chunkNumber 0, no eTag)', () => {
    const parsed = UploadNextSchema.parse({
      sessionId: 'sess_abc123',
      chunkNumber: 0,
    });
    expect(parsed.chunkNumber).toBe(0);
    expect(parsed.eTag).toBeUndefined();
  });

  it('rejects a negative or non-integer chunkNumber', () => {
    expect(UploadNextSchema.safeParse({ chunkNumber: -1 }).success).toBe(false);
    expect(UploadNextSchema.safeParse({ chunkNumber: 1.5 }).success).toBe(
      false,
    );
  });

  it('rejects non-integer / negative size and non-positive chunkSize', () => {
    expect(UploadNextSchema.safeParse({ size: -1 }).success).toBe(false);
    expect(UploadNextSchema.safeParse({ size: 1.5 }).success).toBe(false);
    expect(UploadNextSchema.safeParse({ chunkSize: 0 }).success).toBe(false);
  });

  it('trims string fields', () => {
    const parsed = UploadNextSchema.parse({ sessionId: '  sess_x  ' });
    expect(parsed.sessionId).toBe('sess_x');
  });
});
