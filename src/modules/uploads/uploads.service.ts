import { randomBytes } from 'node:crypto';
import { basename } from 'node:path';

import {
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  HeadObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kysely, type ExpressionBuilder } from 'kysely';

import { APP_DB } from '../../database/db.provider';
import {
  COMMUNITY_TENANT_ID,
  type DB,
  type UploadPartRef,
} from '../../database/schema';
import { AppLoggerService } from '../../logger/app-logger.service';
import { PlaybackService } from './playback.service';
import { UploadNextDto } from './uploads.schema';
import { baseMime, isAllowedVideoMime } from './uploads.util';

/** The authenticated uploader; null for an anonymous (ownerless) upload. */
export interface Uploader {
  userId: number;
  tenantId: number;
}

export interface NextInProgress {
  sessionId: string;
  status: 'in_progress';
  nextChunkNumber: number;
  url: string; // presigned S3 UploadPart URL for nextChunkNumber
}
export interface NextCompleted {
  sessionId: string;
  status: 'completed';
  videoId: string;
}
export type NextResult = NextInProgress | NextCompleted;

/** Everything finalize() needs to complete an upload without re-reading the row. */
interface FinalizeSession {
  id: number;
  token: string;
  s3Key: string;
  s3UploadId: string;
  parts: UploadPartRef[];
  videoId: string;
}

/** What Phase A (the locked transaction) decides; Phase B acts on it after commit. */
type Decision =
  | { kind: 'completed'; token: string; videoId: string }
  | {
      kind: 'reissue';
      token: string;
      s3Key: string;
      s3UploadId: string;
      part: number;
    }
  | { kind: 'finalize'; session: FinalizeSession };

// S3 hard rules (see docs/md/BACKEND_UPLOAD_SPEC.md §5).
const S3_MIN_PART_BYTES = 5 * 1024 * 1024; // non-last parts must be >= 5 MiB
const S3_MAX_PARTS = 10_000;
/**
 * Direct-to-S3 chunked upload via a single endpoint (POST /uploads/next), in a
 * strict lockstep S3 Multipart Upload. The backend never sees the video bytes:
 * it mints one presigned UploadPart URL at a time and finalizes with
 * CompleteMultipartUpload once the last chunk's ETag is confirmed. Auth is
 * OPTIONAL — anonymous uploads are ownerless in the Community tenant, guarded by
 * the unguessable session_token. Implements docs/md/BACKEND_UPLOAD_SPEC.md.
 */
@Injectable()
export class UploadsService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly urlTtlSec: number;
  private readonly maxPartBytes: number;
  private readonly maxParts: number;

  constructor(
    @Inject(APP_DB) private readonly db: Kysely<DB>,
    config: ConfigService,
    private readonly logger: AppLoggerService,
    private readonly playback: PlaybackService,
  ) {
    this.logger.setContext(UploadsService.name);
    // Direct-to-S3 requires S3 config — there is no local-storage fallback here.
    this.bucket = config.getOrThrow<string>('uploads.s3Bucket');
    this.urlTtlSec = config.getOrThrow<number>('uploads.urlTtlSeconds');
    this.maxPartBytes = config.getOrThrow<number>('uploads.maxPartBytes');
    this.maxParts = Math.min(
      config.getOrThrow<number>('uploads.maxParts'),
      S3_MAX_PARTS,
    );
    const accessKeyId = config.get<string>('aws.accessKeyId');
    const secretAccessKey = config.get<string>('aws.secretAccessKey');
    const endpoint = config.get<string>('aws.s3Endpoint');
    this.s3 = new S3Client({
      region: config.getOrThrow<string>('aws.region'),
      endpoint,
      forcePathStyle:
        config.getOrThrow<string>('aws.s3ForcePathStyle') === 'true',
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    });
    this.logger.log(
      `Direct-to-S3 uploads: bucket "${this.bucket}"${endpoint ? ` @ ${endpoint}` : ''}`,
    );
  }

  /** Single entry point: first call (no sessionId) starts; later calls confirm. */
  next(actor: Uploader | null, dto: UploadNextDto): Promise<NextResult> {
    return dto.sessionId
      ? this.confirm(actor, dto, dto.sessionId)
      : this.start(actor, dto);
  }

  // ─── first call: CreateMultipartUpload + presign chunk 1 ──────────────────────
  private async start(
    actor: Uploader | null,
    dto: UploadNextDto,
  ): Promise<NextInProgress> {
    const { filename, mime, size, chunkSize, chunkCount } = dto;
    if (
      filename === undefined ||
      mime === undefined ||
      size === undefined ||
      chunkSize === undefined ||
      chunkCount === undefined
    ) {
      fail(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'INVALID_CHUNK_PLAN',
        'filename, mime, size, chunkSize and chunkCount are required to start an upload.',
      );
    }
    // MediaRecorder often sends "video/webm;codecs=vp9,opus" — match on base type.
    const contentType = baseMime(mime);
    if (!isAllowedVideoMime(mime)) {
      fail(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'UNSUPPORTED_MIME',
        `Unsupported video type: ${mime}.`,
      );
    }
    this.validateChunkPlan(size, chunkSize, chunkCount);

    const tenantId = actor?.tenantId ?? COMMUNITY_TENANT_ID;
    const sessionToken = `sess_${randomToken(18)}`;
    const s3Key = `videos/${tenantId}/${sessionToken}/${sanitizeName(filename)}`;

    // Create the S3 multipart upload first — we need its UploadId to persist.
    let created;
    try {
      created = await this.s3.send(
        new CreateMultipartUploadCommand({
          Bucket: this.bucket,
          Key: s3Key,
          ContentType: contentType,
        }),
      );
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code?: string }).code)
          : '';
      this.logger.error(
        `S3 CreateMultipartUpload failed for ${s3Key}: ${err instanceof Error ? err.message : String(err)}`,
      );
      if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ECONNRESET') {
        fail(
          HttpStatus.SERVICE_UNAVAILABLE,
          'STORAGE_UNAVAILABLE',
          'Object storage is unreachable. Start LocalStack (port 4566) or MinIO (port 9000) and check S3_ENDPOINT.',
        );
      }
      fail(
        HttpStatus.BAD_GATEWAY,
        'STORAGE_ERROR',
        'Object storage rejected CreateMultipartUpload.',
      );
    }
    const s3UploadId = created.UploadId;
    if (!s3UploadId) {
      fail(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'SERVER_ERROR',
        'S3 did not return an upload id.',
      );
    }

    await this.db
      .insertInto('upload_session')
      .values({
        session_token: sessionToken,
        tenant_id: tenantId,
        s3_key: s3Key,
        s3_upload_id: s3UploadId,
        filename,
        mime_type: contentType,
        size_bytes: size,
        chunk_size: chunkSize,
        chunk_count: chunkCount,
        next_chunk_number: 1,
        parts: '[]',
        created_by: actor?.userId ?? null,
      })
      .execute();

    const url = await this.presignPart(s3Key, s3UploadId, 1);
    return {
      sessionId: sessionToken,
      status: 'in_progress',
      nextChunkNumber: 1,
      url,
    };
  }

  // ─── later calls: confirm previous chunk, presign next (or complete) ──────────
  private async confirm(
    actor: Uploader | null,
    dto: UploadNextDto,
    sessionId: string,
  ): Promise<NextResult> {
    const chunkNumber = dto.chunkNumber;
    if (chunkNumber === undefined) {
      fail(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'INVALID_CHUNK_PLAN',
        'chunkNumber is required when sessionId is present.',
      );
    }

    // Phase A — decide and stage under the row lock. NO S3/network calls happen
    // here, so the FOR UPDATE lock and pooled connection are never held across
    // S3 I/O (that would risk pool exhaustion). The last chunk is staged with a
    // STABLE video_id (the finalization-pending marker) so the actual
    // CompleteMultipartUpload can run after commit and be safely retried.
    const decision: Decision = await this.db
      .transaction()
      .execute(async (trx): Promise<Decision> => {
        const session = await trx
          .selectFrom('upload_session')
          .selectAll()
          .where('session_token', '=', sessionId)
          .where(this.ownedBy(actor))
          .forUpdate()
          .executeTakeFirst();
        if (!session) {
          fail(
            HttpStatus.GONE,
            'EXPIRED_SESSION',
            'Upload session not found or expired.',
          );
        }

        // Terminal: already completed -> replay.
        if (session.status === 'completed') {
          return {
            kind: 'completed',
            token: session.session_token,
            videoId: session.video_id ?? '',
          };
        }
        // Staged but not yet finalized: video_id is minted when the last chunk is
        // staged (before S3 completion), so a non-null video_id on a not-yet-
        // completed row means finalization is pending -> reconcile with S3.
        // (This is why no separate 'completing' status is needed.)
        if (session.video_id !== null) {
          return { kind: 'finalize', session: toFinalize(session) };
        }

        // status === 'in_progress'
        const nextN = session.next_chunk_number;

        // Resume (chunkNumber:0) or a retry of the already-confirmed chunk: just
        // re-issue the URL for the chunk still awaiting confirmation.
        if (chunkNumber === 0 || chunkNumber === nextN - 1) {
          return {
            kind: 'reissue',
            token: session.session_token,
            s3Key: session.s3_key,
            s3UploadId: session.s3_upload_id,
            part: nextN,
          };
        }

        // Fresh confirmation of the awaited chunk.
        if (chunkNumber === nextN) {
          if (!dto.eTag) {
            fail(
              HttpStatus.UNPROCESSABLE_ENTITY,
              'INVALID_CHUNK_PLAN',
              'eTag is required to confirm a chunk.',
            );
          }
          const parts: UploadPartRef[] = [
            ...session.parts,
            { chunkNumber, eTag: dto.eTag },
          ];

          if (chunkNumber === session.chunk_count) {
            // Last chunk: stage completion (persist parts + a STABLE video_id) and
            // COMMIT before touching S3. Status stays 'in_progress'; the non-null
            // video_id is the "finalization pending" marker a retry keys off.
            const videoId = `vid_${randomToken(12)}`;
            await trx
              .updateTable('upload_session')
              .set({
                parts: JSON.stringify(parts),
                video_id: videoId,
                updated_by: actor?.userId ?? null,
              })
              .where('id', '=', session.id)
              .execute();
            return {
              kind: 'finalize',
              session: {
                id: session.id,
                token: session.session_token,
                s3Key: session.s3_key,
                s3UploadId: session.s3_upload_id,
                parts,
                videoId,
              },
            };
          }

          const newNext = chunkNumber + 1;
          await trx
            .updateTable('upload_session')
            .set({
              parts: JSON.stringify(parts),
              next_chunk_number: newNext,
              updated_by: actor?.userId ?? null,
            })
            .where('id', '=', session.id)
            .execute();
          return {
            kind: 'reissue',
            token: session.session_token,
            s3Key: session.s3_key,
            s3UploadId: session.s3_upload_id,
            part: newNext,
          };
        }

        // Out of the lockstep sequence.
        fail(
          HttpStatus.CONFLICT,
          'UNEXPECTED_CHUNK',
          `Expected chunk ${nextN}, got ${chunkNumber}.`,
        );
      });

    // Phase B — act on the decision OUTSIDE the transaction (S3 / presign).
    if (decision.kind === 'completed') {
      return completedResult(decision.token, decision.videoId);
    }
    if (decision.kind === 'reissue') {
      const url = await this.presignPart(
        decision.s3Key,
        decision.s3UploadId,
        decision.part,
      );
      return {
        sessionId: decision.token,
        status: 'in_progress',
        nextChunkNumber: decision.part,
        url,
      };
    }
    return this.finalize(decision.session);
  }

  /**
   * Runs CompleteMultipartUpload outside any DB transaction, then marks the
   * session completed. Idempotent and recoverable: if the multipart upload is
   * already gone, an existing object means a prior attempt completed it (finalize
   * the row, replay the stable video_id) while a missing object means it was
   * aborted (410). The video_id was persisted at staging, so retries are stable.
   */
  private async finalize(session: FinalizeSession): Promise<NextCompleted> {
    const sorted = [...session.parts].sort(
      (a, b) => a.chunkNumber - b.chunkNumber,
    );
    try {
      await this.s3.send(
        new CompleteMultipartUploadCommand({
          Bucket: this.bucket,
          Key: session.s3Key,
          UploadId: session.s3UploadId,
          MultipartUpload: {
            Parts: sorted.map((p) => ({
              PartNumber: p.chunkNumber,
              ETag: p.eTag,
            })),
          },
        }),
      );
    } catch (err) {
      if (isNoSuchUpload(err)) {
        // Upload gone: object present => already completed (fall through and
        // finalize); object absent => aborted/expired => 410.
        if (!(await this.objectExists(session.s3Key))) {
          fail(
            HttpStatus.GONE,
            'EXPIRED_SESSION',
            'Upload session expired before it could be completed.',
          );
        }
      } else {
        throw err;
      }
    }

    const res = await this.db
      .updateTable('upload_session')
      .set({ status: 'completed', completed_at: new Date() })
      .where('id', '=', session.id)
      .where('status', '=', 'in_progress') // idempotent: a completed row is skipped
      .executeTakeFirst();
    // Only the call that actually flips the row to completed kicks the transcode
    // (a replay/retry updates 0 rows and must not re-kick). Fire-and-forget so the
    // upload response isn't blocked; the sweep retries if this attempt fails.
    if ((res.numUpdatedRows ?? 0n) > 0n) {
      this.playback.transcodeNow(session.id, session.s3Key);
    }
    return completedResult(session.token, session.videoId);
  }

  private async objectExists(key: string): Promise<boolean> {
    try {
      await this.s3.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch (err) {
      if (isNotFound(err)) return false;
      throw err;
    }
  }

  private presignPart(
    key: string,
    uploadId: string,
    partNumber: number,
  ): Promise<string> {
    return getSignedUrl(
      this.s3,
      new UploadPartCommand({
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
      }),
      { expiresIn: this.urlTtlSec },
    );
  }

  private validateChunkPlan(
    size: number,
    chunkSize: number,
    chunkCount: number,
  ): void {
    if (chunkCount > this.maxParts) {
      fail(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'INVALID_CHUNK_PLAN',
        `Too many chunks (max ${this.maxParts}).`,
      );
    }
    if (chunkSize > this.maxPartBytes) {
      fail(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'INVALID_CHUNK_PLAN',
        `chunkSize exceeds the maximum of ${this.maxPartBytes} bytes.`,
      );
    }
    // Every non-last chunk must clear S3's 5 MiB floor.
    if (chunkCount > 1 && chunkSize < S3_MIN_PART_BYTES) {
      fail(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'INVALID_CHUNK_PLAN',
        `chunkSize must be at least ${S3_MIN_PART_BYTES} bytes for a multi-chunk upload.`,
      );
    }
    if (chunkCount !== Math.ceil(size / chunkSize)) {
      fail(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'INVALID_CHUNK_PLAN',
        'chunkCount must equal ceil(size / chunkSize).',
      );
    }
  }

  /** Owner scope: authed -> own rows in own tenant; anonymous -> ownerless rows. */
  private ownedBy(actor: Uploader | null) {
    return (eb: ExpressionBuilder<DB, 'upload_session'>) =>
      actor
        ? eb.and([
            eb('created_by', '=', actor.userId),
            eb('tenant_id', '=', actor.tenantId),
          ])
        : eb('created_by', 'is', null);
  }
}

function completedResult(sessionToken: string, videoId: string): NextCompleted {
  return { sessionId: sessionToken, status: 'completed', videoId };
}

function randomToken(bytes: number): string {
  return randomBytes(bytes).toString('base64url');
}

/** Keep a human-readable name but strip anything path- or shell-unsafe. */
function sanitizeName(filename: string): string {
  const base = basename(filename).replace(/[^A-Za-z0-9._-]/g, '_');
  const trimmed = base.replace(/^\.+/, '').slice(0, 120);
  return trimmed.length > 0 ? trimmed : 'video';
}

/** Map a full session row to the minimal shape finalize() needs. */
function toFinalize(s: {
  id: number;
  session_token: string;
  s3_key: string;
  s3_upload_id: string;
  parts: UploadPartRef[];
  video_id: string | null;
}): FinalizeSession {
  return {
    id: s.id,
    token: s.session_token,
    s3Key: s.s3_key,
    s3UploadId: s.s3_upload_id,
    parts: s.parts,
    videoId: s.video_id ?? '',
  };
}

// Match on the SPECIFIC S3 error name only — NOT any 404. A different 404 (e.g.
// NoSuchBucket from a deleted/misconfigured bucket) must propagate as a 500, not
// be reconciled away as "upload gone" / "object absent" and masked as a 410.

/** True for an S3 "multipart upload no longer exists" error. */
function isNoSuchUpload(err: unknown): boolean {
  return (err as { name?: string })?.name === 'NoSuchUpload';
}

/** True for an S3 "object does not exist" error (HeadObject/GetObject). */
function isNotFound(err: unknown): boolean {
  const name = (err as { name?: string })?.name;
  return name === 'NotFound' || name === 'NoSuchKey';
}

/** Throw the spec's { code, message } error body (§6) with an HTTP status. */
function fail(status: HttpStatus, code: string, message: string): never {
  throw new HttpException({ code, message }, status);
}
