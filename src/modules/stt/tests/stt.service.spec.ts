import {
  GetObjectCommand,
  type GetObjectCommandOutput,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  DeleteTranscriptionJobCommand,
  GetTranscriptionJobCommand,
  StartTranscriptionJobCommand,
  TranscribeClient,
} from '@aws-sdk/client-transcribe';
import { HttpException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { mockClient } from 'aws-sdk-client-mock';
import type { Kysely } from 'kysely';

import type { DB } from '../../../database/schema';
import type { AppLoggerService } from '../../../logging/app-logger.service';
import { SttService } from '../stt.service';

/**
 * Tier-1 tests: the AWS SDK v3 clients are mocked with aws-sdk-client-mock and the
 * Kysely handle is a small chainable fake, so the full StartTranscriptionJob /
 * GetTranscriptionJob / transcript-fetch flow is exercised deterministically
 * WITHOUT a real AWS account or Postgres. This verifies the command shapes we
 * send, the row we record, and how we map AWS responses/errors + serve terminal
 * jobs from the DB. The DB writes themselves are covered by the live E2E.
 */
const transcribeMock = mockClient(TranscribeClient);
const s3Mock = mockClient(S3Client);

const mockLogger = {
  setContext: jest.fn(),
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
} as unknown as AppLoggerService;

const REQUIRED: Record<string, unknown> = {
  'uploads.s3Bucket': 'test-bucket',
  'uploads.urlTtlSeconds': 900,
  'audio.maxBytes': 26_214_400,
  'transcribe.region': 'eu-west-2',
  'transcribe.languageOptions': ['en-GB'],
  'aws.region': 'us-east-1',
  'aws.s3ForcePathStyle': 'true',
};
const OPTIONAL: Record<string, unknown> = {
  'aws.accessKeyId': 'AKIATEST',
  'aws.secretAccessKey': 'secret',
};
const config = {
  getOrThrow: (k: string) => {
    if (!(k in REQUIRED)) throw new Error(`missing config ${k}`);
    return REQUIRED[k];
  },
  get: (k: string) => OPTIONAL[k],
} as unknown as ConfigService;

/** A ConfigService with extra optional keys merged in (e.g. a default language). */
const configWith = (extra: Record<string, unknown>) =>
  ({
    getOrThrow: (k: string) => {
      if (!(k in REQUIRED)) throw new Error(`missing config ${k}`);
      return REQUIRED[k];
    },
    get: (k: string) => ({ ...OPTIONAL, ...extra })[k],
  }) as unknown as ConfigService;

/** Chainable Kysely stub: executeTakeFirst returns `row`, insert values -> onInsert. */
interface FakeDbOpts {
  row?: Record<string, unknown>;
  rows?: Record<string, unknown>[];
  onInsert?: (values: Record<string, unknown>) => void;
  executeRejects?: boolean;
}
function fakeDb(opts: FakeDbOpts = {}): Kysely<DB> {
  const chain: Record<string, unknown> = {};
  const passthrough = [
    'selectFrom',
    'selectAll',
    'select',
    'where',
    'orderBy',
    'limit',
    'updateTable',
    'set',
    'returning',
    'returningAll',
    'insertInto',
  ];
  for (const m of passthrough) chain[m] = () => chain;
  chain.values = (v: Record<string, unknown>) => {
    opts.onInsert?.(v);
    return chain;
  };
  chain.execute = () =>
    opts.executeRejects
      ? Promise.reject(new Error('db down'))
      : Promise.resolve(opts.rows ?? []);
  chain.executeTakeFirst = () => Promise.resolve(opts.row);
  chain.executeTakeFirstOrThrow = () => Promise.resolve(opts.row ?? {});
  return chain as unknown as Kysely<DB>;
}

const svc = (row?: Record<string, unknown>) =>
  new SttService(config, fakeDb({ row }), mockLogger);

function bodyOf(json: string): GetObjectCommandOutput['Body'] {
  return {
    transformToString: () => Promise.resolve(json),
  } as unknown as GetObjectCommandOutput['Body'];
}

/** Run a rejecting call and return the HttpException's status + code. */
async function errOf(
  p: Promise<unknown>,
): Promise<{ status: number; code: string }> {
  try {
    await p;
    throw new Error('expected the call to throw');
  } catch (e) {
    const ex = e as HttpException;
    return {
      status: ex.getStatus(),
      code: (ex.getResponse() as { code: string }).code,
    };
  }
}

beforeEach(() => {
  transcribeMock.reset();
  s3Mock.reset();
});

describe('SttService.startJob', () => {
  it('starts an auto-detect job with the correct AWS params', async () => {
    transcribeMock.on(StartTranscriptionJobCommand).resolves({});
    const res = await svc().startJob(null, {
      s3Key: 'transcribe-clips/1/123-ab.webm',
    });
    expect(res.status).toBe('queued');
    expect(res.jobId).toMatch(/^safein_stt_[0-9a-f]{24}$/);

    const input = transcribeMock.commandCalls(StartTranscriptionJobCommand)[0]
      .args[0].input;
    expect(input.TranscriptionJobName).toBe(res.jobId);
    expect(input.Media?.MediaFileUri).toBe(
      's3://test-bucket/transcribe-clips/1/123-ab.webm',
    );
    expect(input.MediaFormat).toBe('webm');
    expect(input.OutputBucketName).toBe('test-bucket');
    expect(input.OutputKey).toBe(`transcripts/${res.jobId}.json`);
    expect(input.IdentifyLanguage).toBe(true);
    expect(input.LanguageOptions).toEqual(['en-GB']);
    expect(input.LanguageCode).toBeUndefined();
  });

  it('pins LanguageCode when a language is given (no auto-detect)', async () => {
    transcribeMock.on(StartTranscriptionJobCommand).resolves({});
    await svc().startJob(null, {
      s3Key: 'transcribe-clips/1/x.mp4',
      language: 'en-US',
    });
    const input = transcribeMock.commandCalls(StartTranscriptionJobCommand)[0]
      .args[0].input;
    expect(input.LanguageCode).toBe('en-US');
    expect(input.IdentifyLanguage).toBeUndefined();
    expect(input.MediaFormat).toBe('mp4');
  });

  it('falls back to TRANSCRIBE_DEFAULT_LANGUAGE when the request omits one', async () => {
    transcribeMock.on(StartTranscriptionJobCommand).resolves({});
    const svcWithDefault = new SttService(
      configWith({ 'transcribe.defaultLanguage': 'en-US' }),
      fakeDb(),
      mockLogger,
    );
    await svcWithDefault.startJob(null, {
      s3Key: 'transcribe-clips/1/x.webm',
    });
    const input = transcribeMock.commandCalls(StartTranscriptionJobCommand)[0]
      .args[0].input;
    expect(input.LanguageCode).toBe('en-US');
    expect(input.IdentifyLanguage).toBeUndefined();
    expect(input.LanguageOptions).toBeUndefined();
  });

  it('a per-request language overrides the configured default', async () => {
    transcribeMock.on(StartTranscriptionJobCommand).resolves({});
    const svcWithDefault = new SttService(
      configWith({ 'transcribe.defaultLanguage': 'en-US' }),
      fakeDb(),
      mockLogger,
    );
    await svcWithDefault.startJob(null, {
      s3Key: 'transcribe-clips/1/x.webm',
      language: 'en-GB',
    });
    const input = transcribeMock.commandCalls(StartTranscriptionJobCommand)[0]
      .args[0].input;
    expect(input.LanguageCode).toBe('en-GB');
    expect(input.IdentifyLanguage).toBeUndefined();
  });

  it('records the started job in transcription_job', async () => {
    transcribeMock.on(StartTranscriptionJobCommand).resolves({});
    let inserted: Record<string, unknown> | undefined;
    const s = new SttService(
      config,
      fakeDb({ onInsert: (v) => (inserted = v) }),
      mockLogger,
    );
    const res = await s.startJob(
      { userId: 5, tenantId: 3 },
      { s3Key: 'transcribe-clips/3/x.webm', language: 'en-US' },
    );
    expect(inserted).toMatchObject({
      job_name: res.jobId,
      s3_key: 'transcribe-clips/3/x.webm',
      language: 'en-US',
      tenant_id: 3,
      created_by: 5,
    });
  });

  it('records an anonymous job under the Community tenant, no language', async () => {
    transcribeMock.on(StartTranscriptionJobCommand).resolves({});
    let inserted: Record<string, unknown> | undefined;
    const s = new SttService(
      config,
      fakeDb({ onInsert: (v) => (inserted = v) }),
      mockLogger,
    );
    await s.startJob(null, { s3Key: 'transcribe-clips/1/x.webm' });
    expect(inserted).toMatchObject({
      tenant_id: 1,
      language: null,
      created_by: null,
    });
  });

  it('rejects a key outside the transcribe prefix (422), no AWS call', async () => {
    expect(
      await errOf(svc().startJob(null, { s3Key: 'videos/1/x.mp4' })),
    ).toEqual({
      status: 422,
      code: 'INVALID_S3_KEY',
    });
    expect(
      transcribeMock.commandCalls(StartTranscriptionJobCommand),
    ).toHaveLength(0);
  });

  it('rejects an unsupported extension (422)', async () => {
    expect(
      await errOf(svc().startJob(null, { s3Key: 'transcribe-clips/1/x.ogg' })),
    ).toEqual({ status: 422, code: 'UNSUPPORTED_MIME' });
  });

  it('maps an AWS StartTranscriptionJob failure to 502', async () => {
    transcribeMock
      .on(StartTranscriptionJobCommand)
      .rejects(new Error('aws down'));
    expect(
      await errOf(svc().startJob(null, { s3Key: 'transcribe-clips/1/x.webm' })),
    ).toEqual({ status: 502, code: 'SERVER_ERROR' });
  });

  it('cancels the AWS job and 502s if recording it in the DB fails', async () => {
    transcribeMock.on(StartTranscriptionJobCommand).resolves({});
    transcribeMock.on(DeleteTranscriptionJobCommand).resolves({});
    const s = new SttService(config, fakeDb({ executeRejects: true }), mockLogger);
    expect(
      await errOf(s.startJob(null, { s3Key: 'transcribe-clips/1/x.webm' })),
    ).toEqual({ status: 502, code: 'SERVER_ERROR' });
    // best-effort compensation so AWS isn't left running a job we can't track
    expect(
      transcribeMock.commandCalls(DeleteTranscriptionJobCommand),
    ).toHaveLength(1);
  });
});

describe('SttService.getJob', () => {
  const JOB = `safein_stt_${'a'.repeat(24)}`;
  // A non-terminal DB row, so getJob polls AWS.
  const pending = (): Record<string, unknown> => ({
    id: 7,
    job_name: JOB,
    status: 'queued',
    s3_key: 'transcribe-clips/1/x.webm',
    language: null,
    transcript: null,
    failure_reason: null,
    created_at: new Date(),
    completed_at: null,
  });

  it('404s a malformed jobId without touching AWS', async () => {
    expect(await errOf(svc().getJob('not-a-job'))).toEqual({
      status: 404,
      code: 'JOB_NOT_FOUND',
    });
    expect(
      transcribeMock.commandCalls(GetTranscriptionJobCommand),
    ).toHaveLength(0);
  });

  it('404s a job that is not in the DB', async () => {
    expect(await errOf(svc(undefined).getJob(JOB))).toEqual({
      status: 404,
      code: 'JOB_NOT_FOUND',
    });
    expect(
      transcribeMock.commandCalls(GetTranscriptionJobCommand),
    ).toHaveLength(0);
  });

  it('serves a terminal (completed) job from the DB, no AWS call', async () => {
    const row = {
      ...pending(),
      status: 'completed',
      transcript: 'stored text',
    };
    expect(await svc(row).getJob(JOB)).toEqual({
      jobId: JOB,
      status: 'completed',
      text: 'stored text',
    });
    expect(
      transcribeMock.commandCalls(GetTranscriptionJobCommand),
    ).toHaveLength(0);
  });

  it('serves a terminal (failed) job from the DB, no AWS call', async () => {
    const row = {
      ...pending(),
      status: 'failed',
      failure_reason: 'bad audio',
    };
    expect(await svc(row).getJob(JOB)).toEqual({
      jobId: JOB,
      status: 'failed',
      error: 'bad audio',
    });
    expect(
      transcribeMock.commandCalls(GetTranscriptionJobCommand),
    ).toHaveLength(0);
  });

  it('polls AWS for a non-terminal row and maps IN_PROGRESS', async () => {
    transcribeMock.on(GetTranscriptionJobCommand).resolves({
      TranscriptionJob: { TranscriptionJobStatus: 'IN_PROGRESS' },
    });
    expect(await svc(pending()).getJob(JOB)).toEqual({
      jobId: JOB,
      status: 'in_progress',
    });
  });

  it('COMPLETED -> fetches transcripts/<jobId>.json and flattens it', async () => {
    transcribeMock
      .on(GetTranscriptionJobCommand)
      .resolves({ TranscriptionJob: { TranscriptionJobStatus: 'COMPLETED' } });
    s3Mock.on(GetObjectCommand).resolves({
      Body: bodyOf(
        JSON.stringify({
          results: { transcripts: [{ transcript: 'hello world' }] },
        }),
      ),
    });
    expect(await svc(pending()).getJob(JOB)).toEqual({
      jobId: JOB,
      status: 'completed',
      text: 'hello world',
    });
    expect(s3Mock.commandCalls(GetObjectCommand)[0].args[0].input.Key).toBe(
      `transcripts/${JOB}.json`,
    );
  });

  it('FAILED -> returns the failure reason', async () => {
    transcribeMock.on(GetTranscriptionJobCommand).resolves({
      TranscriptionJob: {
        TranscriptionJobStatus: 'FAILED',
        FailureReason: 'bad audio',
      },
    });
    expect(await svc(pending()).getJob(JOB)).toEqual({
      jobId: JOB,
      status: 'failed',
      error: 'bad audio',
    });
  });

  it('unknown job (AWS BadRequestException) -> 404', async () => {
    transcribeMock
      .on(GetTranscriptionJobCommand)
      .rejects(
        Object.assign(new Error('not found'), { name: 'BadRequestException' }),
      );
    expect(await errOf(svc(pending()).getJob(JOB))).toEqual({
      status: 404,
      code: 'JOB_NOT_FOUND',
    });
  });

  it('COMPLETED but transcript fetch fails -> 502 (contract envelope)', async () => {
    transcribeMock
      .on(GetTranscriptionJobCommand)
      .resolves({ TranscriptionJob: { TranscriptionJobStatus: 'COMPLETED' } });
    s3Mock.on(GetObjectCommand).rejects(new Error('s3 down'));
    expect(await errOf(svc(pending()).getJob(JOB))).toEqual({
      status: 502,
      code: 'SERVER_ERROR',
    });
  });
});

describe('SttService.list', () => {
  it('returns [] for an anonymous caller (never enumerates the ownerless pool)', async () => {
    // fakeDb would return rows, but list() must short-circuit before querying.
    const s = new SttService(
      config,
      fakeDb({ rows: [{ job_name: 'x' }] }),
      mockLogger,
    );
    expect(await s.list(null)).toEqual([]);
  });

  it('maps rows to views for an authenticated caller', async () => {
    const s = new SttService(
      config,
      fakeDb({
        rows: [
          {
            job_name: 'safein_stt_' + 'b'.repeat(24),
            status: 'completed',
            s3_key: 'transcribe-clips/3/a.webm',
            language: 'en-US',
            transcript: 'hi',
            failure_reason: null,
            created_at: new Date('2026-01-01T00:00:00Z'),
            completed_at: new Date('2026-01-02T00:00:00Z'),
          },
        ],
      }),
      mockLogger,
    );
    expect(await s.list({ userId: 5, tenantId: 3 })).toEqual([
      {
        jobId: 'safein_stt_' + 'b'.repeat(24),
        status: 'completed',
        s3Key: 'transcribe-clips/3/a.webm',
        language: 'en-US',
        text: 'hi',
        error: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        completedAt: new Date('2026-01-02T00:00:00Z'),
      },
    ]);
  });
});
