import { SttPresignSchema, StartJobSchema } from '../stt.schema';
import {
  flattenTranscript,
  mediaFormatFromKey,
  sttStatusFromAws,
} from '../stt.util';

describe('mediaFormatFromKey', () => {
  it('maps our stored extensions to AWS MediaFormat', () => {
    expect(mediaFormatFromKey('transcribe-clips/1/123-ab.webm')).toBe('webm');
    expect(mediaFormatFromKey('transcribe-clips/1/123-ab.mp4')).toBe('mp4');
    expect(mediaFormatFromKey('transcribe-clips/1/123-ab.m4a')).toBe('m4a');
  });

  it('returns null for unknown / missing extensions', () => {
    expect(mediaFormatFromKey('transcribe-clips/1/123-ab.ogg')).toBeNull();
    expect(mediaFormatFromKey('transcribe-clips/1/noext')).toBeNull();
  });
});

describe('sttStatusFromAws', () => {
  it('maps AWS statuses', () => {
    expect(sttStatusFromAws('QUEUED')).toBe('queued');
    expect(sttStatusFromAws('IN_PROGRESS')).toBe('in_progress');
    expect(sttStatusFromAws('COMPLETED')).toBe('completed');
    expect(sttStatusFromAws('FAILED')).toBe('failed');
  });

  it('treats unknown/undefined as still-running (non-terminal)', () => {
    expect(sttStatusFromAws(undefined)).toBe('in_progress');
    expect(sttStatusFromAws('SOMETHING_NEW')).toBe('in_progress');
  });
});

describe('flattenTranscript', () => {
  it('extracts results.transcripts[0].transcript', () => {
    const json = { results: { transcripts: [{ transcript: 'hello world' }] } };
    expect(flattenTranscript(json)).toBe('hello world');
  });

  it('is defensive against shape drift / junk', () => {
    expect(flattenTranscript({})).toBe('');
    expect(flattenTranscript({ results: {} })).toBe('');
    expect(flattenTranscript({ results: { transcripts: [] } })).toBe('');
    expect(flattenTranscript(null)).toBe('');
    expect(flattenTranscript('nope')).toBe('');
  });
});

describe('STT schemas', () => {
  it('presign requires mime + positive size', () => {
    expect(
      SttPresignSchema.safeParse({ mime: 'audio/webm', size: 100 }).success,
    ).toBe(true);
    expect(
      SttPresignSchema.safeParse({ mime: 'audio/webm', size: -1 }).success,
    ).toBe(false);
  });

  it('start-job requires s3Key; language optional BCP-47', () => {
    expect(
      StartJobSchema.parse({ s3Key: 'transcribe-clips/1/x.webm' }),
    ).toEqual({
      s3Key: 'transcribe-clips/1/x.webm',
    });
    expect(
      StartJobSchema.safeParse({ s3Key: 'x', language: 'en-GB' }).success,
    ).toBe(true);
    expect(
      StartJobSchema.safeParse({ s3Key: 'x', language: 'english' }).success,
    ).toBe(false);
    expect(StartJobSchema.safeParse({ language: 'en-GB' }).success).toBe(false);
  });
});
