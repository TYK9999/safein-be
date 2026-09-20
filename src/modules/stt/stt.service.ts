import { randomBytes } from 'node:crypto';

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  DeleteTranscriptionJobCommand,
  GetTranscriptionJobCommand,
  type LanguageCode,
  type MediaFormat,
  StartTranscriptionJobCommand,
  TranscribeClient,
  type TranscriptionJob,
} from '@aws-sdk/client-transcribe';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ExpressionBuilder, Kysely } from 'kysely';

import { APP_DB } from '../../database/db.provider';
import {
  COMMUNITY_TENANT_ID,
  type DB,
  type TranscriptionStatus,
} from '../../database/schema';
import { AppLoggerService } from '../../logging/app-logger.service';
import { buildS3, fail, presignAudioObject } from '../audio/audio.service';
import { SttPresignDto, StartJobDto } from './stt.schema';
import {
  flattenTranscript,
  mediaFormatFromKey,
  sttStatusFromAws,
  type SttStatus,
} from './stt.util';

export interface SttActor {
  userId: number;
  tenantId: number;
}
export interface PresignResult {
  s3Key: string;
  url: string;
}
export interface JobStartResult {
  jobId: string;
  status: 'queued';
}
export interface JobStatusResult {
  jobId: string;
  status: SttStatus;
  text?: string;
  error?: string;
}
/** A recorded transcription job, as returned by list() (history). */
export interface TranscriptionJobView {
  jobId: string;
  status: TranscriptionStatus;
  s3Key: string;
  language: string | null;
  text: string | null;
  error: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

// Short-lived prefix (this audio is discarded after transcription); output JSON.
const KEY_PREFIX = 'transcribe-clips';
const OUTPUT_PREFIX = 'transcripts';
// jobId IS the AWS TranscriptionJobName we mint; validate the shape before any
// AWS call so a malformed id 404s instead of hitting Transcribe.
const JOB_NAME_RE = /^safein_stt_[0-9a-f]{24}$/;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * Speech-to-text via AWS Transcribe. Three stages: presign (upload the clip to a
 * short-lived S3 prefix), start a job, poll it. Each started job is recorded in
 * `transcription_job`; polling advances the row and stores the transcript once
 * complete, so history is queryable without re-hitting AWS/S3 (terminal rows are
 * served straight from the DB). jobId is the AWS TranscriptionJobName and the
 * transcript is also written to transcripts/<jobId>.json. Auth is OPTIONAL
 * (guest-capable). NOTE: AWS Transcribe reads real S3 — it does NOT work against
 * MinIO, so the job stages only run against real AWS (or a LocalStack Pro
 * emulator). See BACKEND_SPEECH_TO_TEXT_SPEC.md.
 */
@Injectable()
export class SttService {
  private readonly s3: S3Client;
  private readonly transcribe: TranscribeClient;
  private readonly bucket: string;
  private readonly urlTtlSec: number;
  private readonly maxBytes: number;
  private readonly languageOptions: string[];
  private readonly defaultLanguage: string | undefined;

  constructor(
    config: ConfigService,
    @Inject(APP_DB) private readonly db: Kysely<DB>,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(SttService.name);
    this.bucket = config.getOrThrow<string>('uploads.s3Bucket');
    this.urlTtlSec = config.getOrThrow<number>('uploads.urlTtlSeconds');
    this.maxBytes = config.getOrThrow<number>('audio.maxBytes');
    this.languageOptions = config.getOrThrow<string[]>(
      'transcribe.languageOptions',
    );
    this.defaultLanguage = config.get<string>('transcribe.defaultLanguage');
    this.s3 = buildS3(config);
    const accessKeyId = config.get<string>('aws.accessKeyId');
    const secretAccessKey = config.get<string>('aws.secretAccessKey');
    // Real AWS by default; an endpoint override points it at a local emulator
    // (LocalStack Pro) for integration testing without a real AWS account.
    this.transcribe = new TranscribeClient({
      region: config.getOrThrow<string>('transcribe.region'),
      endpoint: config.get<string>('transcribe.endpoint'),
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    });
  }

  presign(actor: SttActor | null, dto: SttPresignDto): Promise<PresignResult> {
    return presignAudioObject(this.s3, {
      bucket: this.bucket,
      prefix: KEY_PREFIX,
      urlTtlSec: this.urlTtlSec,
      maxBytes: this.maxBytes,
      tenantId: actor?.tenantId ?? COMMUNITY_TENANT_ID,
      mime: dto.mime,
      size: dto.size,
    });
  }

  async startJob(
    actor: SttActor | null,
    dto: StartJobDto,
  ): Promise<JobStartResult> {
    this.logger.debug(
      `STT job start s3Key=${dto.s3Key} userId=${actor?.userId}`,
      `SttService.startJob`,
    );
    // Only transcribe objects we minted under our prefix.
    if (!dto.s3Key.startsWith(`${KEY_PREFIX}/`)) {
      fail(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'INVALID_S3_KEY',
        'Unknown transcription object.',
      );
    }
    const mediaFormat = mediaFormatFromKey(dto.s3Key);
    if (!mediaFormat) {
      fail(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'UNSUPPORTED_MIME',
        'Unsupported audio format for transcription.',
      );
    }
    const jobId = `safein_stt_${randomBytes(12).toString('hex')}`;
    // Per-request language wins; else the configured default (TRANSCRIBE_DEFAULT_
    // LANGUAGE); else auto-detect. LocalStack's emulator can't auto-detect, so the
    // default lets it transcribe locally without changing prod (where it's unset).
    const language = dto.language ?? this.defaultLanguage;
    try {
      await this.transcribe.send(
        new StartTranscriptionJobCommand({
          TranscriptionJobName: jobId,
          Media: { MediaFileUri: `s3://${this.bucket}/${dto.s3Key}` },
          // mediaFormat is one of our known-good values (unit-tested), which are a
          // subset of AWS's MediaFormat literal union.
          MediaFormat: mediaFormat as MediaFormat,
          OutputBucketName: this.bucket,
          OutputKey: `${OUTPUT_PREFIX}/${jobId}.json`,
          // A resolved language pins LanguageCode; otherwise auto-detect from our
          // configured candidates. (BCP-47 strings validated as our own subset of
          // AWS's LanguageCode union.)
          ...(language
            ? { LanguageCode: language as LanguageCode }
            : {
                IdentifyLanguage: true,
                LanguageOptions: this.languageOptions as LanguageCode[],
              }),
        }),
      );
    } catch (err) {
      this.logger.error(
        `stt.job.start failure jobId=${jobId}: ${msg(err)}`,
        { err },
        `SttService.startJob`,
      );
      fail(
        HttpStatus.BAD_GATEWAY,
        'SERVER_ERROR',
        'Could not start transcription.',
      );
    }
    // Record the job now that AWS accepted it (reached only on success — fail()
    // above throws). This row is what polling/list read back. If the insert fails
    // the AWS job is already running/billing and would be untrackable, so
    // best-effort cancel it and surface the contract error instead of orphaning it.
    try {
      await this.db
        .insertInto('transcription_job')
        .values({
          tenant_id: actor?.tenantId ?? COMMUNITY_TENANT_ID,
          job_name: jobId,
          s3_key: dto.s3Key,
          language: language ?? null,
          created_by: actor?.userId ?? null,
        })
        .execute();
    } catch (err) {
      this.logger.error(
        `stt.job.record failure jobId=${jobId}: ${msg(err)}`,
        { err },
        `SttService.startJob`,
      );
      try {
        await this.transcribe.send(
          new DeleteTranscriptionJobCommand({ TranscriptionJobName: jobId }),
        );
      } catch (cleanupErr) {
        this.logger.error(
          `Failed to cancel orphaned job ${jobId}: ${msg(cleanupErr)}`,
          { err: cleanupErr },
          `SttService.startJob`,
        );
      }
      fail(
        HttpStatus.BAD_GATEWAY,
        'SERVER_ERROR',
        'Could not start transcription.',
      );
    }
    this.logger.info(
      `STT job started jobId=${jobId} tenantId=${actor?.tenantId ?? COMMUNITY_TENANT_ID} userId=${actor?.userId}`,
      `SttService.startJob`,
    );
    return { jobId, status: 'queued' };
  }

  async getJob(jobId: string): Promise<JobStatusResult> {
    if (!JOB_NAME_RE.test(jobId)) {
      fail(HttpStatus.NOT_FOUND, 'JOB_NOT_FOUND', 'No such transcription job.');
    }
    const row = await this.db
      .selectFrom('transcription_job')
      .selectAll()
      .where('job_name', '=', jobId)
      .executeTakeFirst();
    if (!row) {
      fail(HttpStatus.NOT_FOUND, 'JOB_NOT_FOUND', 'No such transcription job.');
    }
    // Terminal states are immutable — serve straight from the DB, no AWS call.
    if (row.status === 'completed') {
      return { jobId, status: 'completed', text: row.transcript ?? '' };
    }
    if (row.status === 'failed') {
      return {
        jobId,
        status: 'failed',
        error: row.failure_reason ?? 'Transcription failed.',
      };
    }

    // Non-terminal — poll AWS and persist any advance.
    let job: TranscriptionJob | undefined;
    try {
      const res = await this.transcribe.send(
        new GetTranscriptionJobCommand({ TranscriptionJobName: jobId }),
      );
      job = res.TranscriptionJob;
    } catch (err) {
      if (isNotFound(err)) {
        fail(
          HttpStatus.NOT_FOUND,
          'JOB_NOT_FOUND',
          'No such transcription job.',
        );
      }
      this.logger.error(
        `GetTranscriptionJob failed: ${msg(err)}`,
        { err },
        `SttService.getJob`,
      );
      fail(
        HttpStatus.BAD_GATEWAY,
        'SERVER_ERROR',
        'Could not read transcription job.',
      );
    }
    if (!job) {
      fail(HttpStatus.NOT_FOUND, 'JOB_NOT_FOUND', 'No such transcription job.');
    }

    const status = sttStatusFromAws(job.TranscriptionJobStatus);
    if (status === 'completed') {
      let text: string;
      try {
        text = await this.fetchTranscript(jobId);
      } catch (err) {
        this.logger.error(
          `fetchTranscript failed for ${jobId}: ${msg(err)}`,
          { err },
          `SttService.getJob`,
        );
        fail(
          HttpStatus.BAD_GATEWAY,
          'SERVER_ERROR',
          'Could not read the transcript.',
        );
      }
      await this.persist(row.id, {
        status,
        transcript: text,
        completed_at: new Date(),
      });
      this.logger.info(
        `STT job completed jobId=${jobId}`,
        `SttService.getJob`,
      );
      return { jobId, status, text };
    }
    if (status === 'failed') {
      const reason = job.FailureReason ?? 'Transcription failed.';
      await this.persist(row.id, {
        status,
        failure_reason: reason,
        completed_at: new Date(),
      });
      this.logger.error(
        `STT job failed jobId=${jobId} reason=${reason}`,
        `SttService.getJob`,
      );
      return { jobId, status, error: reason };
    }
    // queued -> in_progress: persist the advance so history reflects it.
    if (status !== row.status) {
      await this.persist(row.id, { status });
      this.logger.debug(
        `STT job status jobId=${jobId} status=${status}`,
        `SttService.getJob`,
      );
    }
    return { jobId, status };
  }

  /** History: the caller's own jobs, newest first. */
  async list(
    actor: SttActor | null,
    limit?: number,
  ): Promise<TranscriptionJobView[]> {
    // Anonymous callers have no attributable identity — never enumerate the shared
    // ownerless pool (that would return every other guest's transcripts). History
    // is authenticated-only; a guest still reaches a specific job via its jobId.
    if (!actor) return [];
    const rows = await this.db
      .selectFrom('transcription_job')
      .selectAll()
      .where(this.ownedBy(actor))
      .orderBy('created_at', 'desc')
      .limit(clampLimit(limit))
      .execute();
    return rows.map(toJobView);
  }

  private async persist(
    id: number,
    set: {
      status: TranscriptionStatus;
      transcript?: string;
      failure_reason?: string;
      completed_at?: Date;
    },
  ): Promise<void> {
    await this.db
      .updateTable('transcription_job')
      .set(set)
      .where('id', '=', id)
      .execute();
  }

  private async fetchTranscript(jobId: string): Promise<string> {
    const res = await this.s3.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: `${OUTPUT_PREFIX}/${jobId}.json`,
      }),
    );
    const body = await res.Body!.transformToString();
    return flattenTranscript(JSON.parse(body));
  }

  /** Scope a query to the caller: their own rows, or the ownerless (anon) ones. */
  private ownedBy(actor: SttActor | null) {
    return (eb: ExpressionBuilder<DB, 'transcription_job'>) =>
      actor
        ? eb.and([
            eb('created_by', '=', actor.userId),
            eb('tenant_id', '=', actor.tenantId),
          ])
        : eb('created_by', 'is', null);
  }
}

interface TranscriptionJobRow {
  job_name: string;
  status: TranscriptionStatus;
  s3_key: string;
  language: string | null;
  transcript: string | null;
  failure_reason: string | null;
  created_at: Date;
  completed_at: Date | null;
}

function toJobView(r: TranscriptionJobRow): TranscriptionJobView {
  return {
    jobId: r.job_name,
    status: r.status,
    s3Key: r.s3_key,
    language: r.language,
    text: r.transcript,
    error: r.failure_reason,
    createdAt: r.created_at,
    completedAt: r.completed_at,
  };
}

function clampLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit) || limit < 1) return DEFAULT_LIMIT;
  // Floor: a fractional value would bind to a bigint LIMIT param and raise a
  // Postgres "invalid input syntax for type bigint" (a 500) instead of clamping.
  return Math.min(Math.floor(limit), MAX_LIMIT);
}

function isNotFound(err: unknown): boolean {
  // AWS Transcribe returns BadRequestException when the job name doesn't exist.
  const name = (err as { name?: string })?.name;
  return name === 'BadRequestException' || name === 'NotFoundException';
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
