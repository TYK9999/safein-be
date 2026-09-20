import { randomBytes } from 'node:crypto';

import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ExpressionBuilder, Kysely } from 'kysely';

import { APP_DB } from '../../database/db.provider';
import {
  type AudioClipStatus,
  COMMUNITY_TENANT_ID,
  type DB,
} from '../../database/schema';
import { AppLoggerService } from '../../logging/app-logger.service';
import { AudioPresignDto } from './audio.schema';
import { extForAudioMime, isAllowedAudioMime } from './audio.util';

/** The uploader; null for an anonymous (guest) caller. */
export interface AudioActor {
  userId: number;
  tenantId: number;
}

export interface AudioPresignResult {
  s3Key: string;
  url: string; // presigned S3 PutObject URL for the raw clip
}

/** A recorded audio clip, as returned by confirm/list (history). */
export interface AudioClipView {
  id: number;
  s3Key: string;
  mimeType: string;
  sizeBytes: number;
  status: AudioClipStatus;
  uploadedAt: Date | null;
  createdAt: Date;
}

// Where archived audio clips live (permanent retention, per the spec).
const KEY_PREFIX = 'audio-clips';
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * Audio-clip upload: a single presigned S3 PutObject URL for a small (<=2 min)
 * clip recorded in the browser. The client PUTs the bytes DIRECTLY to S3 — the
 * backend never receives them. A row is written to `audio_clip` at presign
 * (status 'pending'); the client then calls confirm() so we can HeadObject the
 * object and mark it 'uploaded' (the only way to learn a direct upload finished).
 * Auth is OPTIONAL (guest-capable), matching the video flow. Implements
 * docs/../BACKEND_AUDIO_UPLOAD_SPEC.md.
 */
@Injectable()
export class AudioService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly urlTtlSec: number;
  private readonly maxBytes: number;

  constructor(
    config: ConfigService,
    @Inject(APP_DB) private readonly db: Kysely<DB>,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(AudioService.name);
    this.bucket = config.getOrThrow<string>('uploads.s3Bucket');
    this.urlTtlSec = config.getOrThrow<number>('uploads.urlTtlSeconds');
    this.maxBytes = config.getOrThrow<number>('audio.maxBytes');
    this.s3 = buildS3(config);
  }

  async presign(
    actor: AudioActor | null,
    dto: AudioPresignDto,
  ): Promise<AudioPresignResult> {
    const tenantId = actor?.tenantId ?? COMMUNITY_TENANT_ID;
    this.logger.debug(
      `Audio presign start tenantId=${tenantId} userId=${actor?.userId}`,
      `AudioService.presign`,
    );
    const result = await presignAudioObject(this.s3, {
      bucket: this.bucket,
      prefix: KEY_PREFIX,
      urlTtlSec: this.urlTtlSec,
      maxBytes: this.maxBytes,
      tenantId,
      mime: dto.mime,
      size: dto.size,
    });
    // Record the intended upload; confirm() flips it to 'uploaded' once the client
    // reports the direct PUT succeeded. Written after presign so a rejected
    // request (bad mime / oversize) never leaves a row.
    await this.db
      .insertInto('audio_clip')
      .values({
        tenant_id: tenantId,
        s3_key: result.s3Key,
        mime_type: dto.mime,
        size_bytes: dto.size,
        created_by: actor?.userId ?? null,
      })
      .execute();
    this.logger.info(
      `Audio presign success tenantId=${tenantId} userId=${actor?.userId} s3Key=${result.s3Key}`,
      `AudioService.presign`,
    );
    return result;
  }

  /**
   * Called after the direct S3 PUT resolves. Verifies the object is really in S3
   * (and records its true size), then marks the clip 'uploaded'. Idempotent.
   */
  async confirm(
    actor: AudioActor | null,
    s3Key: string,
  ): Promise<AudioClipView> {
    this.logger.debug(
      `Audio confirm start s3Key=${s3Key} userId=${actor?.userId}`,
      `AudioService.confirm`,
    );
    const clip = await this.db
      .selectFrom('audio_clip')
      .selectAll()
      .where('s3_key', '=', s3Key)
      .where(this.ownedBy(actor))
      .executeTakeFirst();
    if (!clip) {
      fail(HttpStatus.NOT_FOUND, 'CLIP_NOT_FOUND', 'No such audio clip.');
    }
    // Idempotent: a repeat confirm replays the recorded state without re-running
    // HeadObject or re-stamping uploaded_at (mirrors the upload_session replay).
    if (clip.status === 'uploaded') {
      this.logger.debug(
        `Audio confirm idempotent id=${clip.id}`,
        `AudioService.confirm`,
      );
      return toClipView(clip);
    }
    const head = await this.headObject(s3Key);
    if (!head.exists) {
      fail(
        HttpStatus.CONFLICT,
        'NOT_UPLOADED',
        'The clip has not been uploaded to storage.',
      );
    }
    const updated = await this.db
      .updateTable('audio_clip')
      .set({
        status: 'uploaded',
        uploaded_at: new Date(),
        size_bytes: head.size ?? clip.size_bytes,
        updated_by: actor?.userId ?? null,
      })
      .where('id', '=', clip.id)
      .returningAll()
      .executeTakeFirstOrThrow();
    this.logger.info(
      `Audio confirm success id=${updated.id} tenantId=${updated.tenant_id} userId=${actor?.userId}`,
      `AudioService.confirm`,
    );
    return toClipView(updated);
  }

  /** History: the caller's own clips, newest first. */
  async list(
    actor: AudioActor | null,
    limit?: number,
  ): Promise<AudioClipView[]> {
    // Anonymous callers have no attributable identity — never enumerate the shared
    // ownerless pool (that would return every other guest's clips). History is an
    // authenticated-only view; a guest still reaches a specific clip via its key.
    if (!actor) return [];
    const rows = await this.db
      .selectFrom('audio_clip')
      .selectAll()
      .where(this.ownedBy(actor))
      .orderBy('created_at', 'desc')
      .limit(clampLimit(limit))
      .execute();
    return rows.map(toClipView);
  }

  /** Does the object exist in S3? Its ContentLength is the true byte size. */
  private async headObject(
    s3Key: string,
  ): Promise<{ exists: boolean; size?: number }> {
    try {
      const head = await this.s3.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: s3Key }),
      );
      return { exists: true, size: head.ContentLength };
    } catch (err) {
      if (isNotFound(err)) return { exists: false };
      fail(
        HttpStatus.BAD_GATEWAY,
        'SERVER_ERROR',
        'Could not verify the uploaded clip.',
      );
    }
  }

  /** Scope a query to the caller: their own rows, or the ownerless (anon) ones. */
  private ownedBy(actor: AudioActor | null) {
    return (eb: ExpressionBuilder<DB, 'audio_clip'>) =>
      actor
        ? eb.and([
            eb('created_by', '=', actor.userId),
            eb('tenant_id', '=', actor.tenantId),
          ])
        : eb('created_by', 'is', null);
  }
}

// ─── shared presign helpers (also used by the STT flow) ───────────────────────

export interface PresignParams {
  bucket: string;
  prefix: string;
  urlTtlSec: number;
  maxBytes: number;
  tenantId: number;
  mime: string;
  size: number;
}

/**
 * Validate the audio request, choose a server-owned key under `prefix`, and
 * presign a single PutObject URL with the declared content type. Throws the
 * spec's { code, message } body on a bad mime / oversize.
 */
export async function presignAudioObject(
  s3: S3Client,
  p: PresignParams,
): Promise<AudioPresignResult> {
  const ext = extForAudioMime(p.mime);
  if (!ext || !isAllowedAudioMime(p.mime)) {
    fail(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'UNSUPPORTED_MIME',
      `Unsupported audio type: ${p.mime}.`,
    );
  }
  if (p.size > p.maxBytes) {
    fail(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'FILE_TOO_LARGE',
      `Audio clip exceeds the ${p.maxBytes}-byte limit.`,
    );
  }
  // Server-chosen key (never a client path). Tenant-prefixed + random.
  const s3Key = `${p.prefix}/${p.tenantId}/${Date.now()}-${randomBytes(6).toString('hex')}.${ext}`;
  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: p.bucket,
      Key: s3Key,
      ContentType: p.mime,
      // Sign the declared size into the URL (content-length becomes a signed
      // header), so the actual PUT must be exactly this many bytes — otherwise
      // the client could declare a small size to pass the cap then upload GBs.
      ContentLength: p.size,
    }),
    { expiresIn: p.urlTtlSec },
  );
  return { s3Key, url };
}

/** Construct the S3 client from config (MinIO in dev via endpoint/path-style). */
export function buildS3(config: ConfigService): S3Client {
  const accessKeyId = config.get<string>('aws.accessKeyId');
  const secretAccessKey = config.get<string>('aws.secretAccessKey');
  return new S3Client({
    region: config.getOrThrow<string>('aws.region'),
    endpoint: config.get<string>('aws.s3Endpoint'),
    forcePathStyle:
      config.getOrThrow<string>('aws.s3ForcePathStyle') === 'true',
    credentials:
      accessKeyId && secretAccessKey
        ? { accessKeyId, secretAccessKey }
        : undefined,
  });
}

/** Throw the spec's { code, message } error body with an HTTP status. */
export function fail(status: HttpStatus, code: string, message: string): never {
  throw new HttpException({ code, message }, status);
}

interface AudioClipRow {
  id: number;
  s3_key: string;
  mime_type: string;
  size_bytes: number;
  status: AudioClipStatus;
  uploaded_at: Date | null;
  created_at: Date;
}

function toClipView(r: AudioClipRow): AudioClipView {
  return {
    id: r.id,
    s3Key: r.s3_key,
    mimeType: r.mime_type,
    sizeBytes: r.size_bytes,
    status: r.status,
    uploadedAt: r.uploaded_at,
    createdAt: r.created_at,
  };
}

function clampLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit) || limit < 1) return DEFAULT_LIMIT;
  // Floor: a fractional value would bind to a bigint LIMIT param and raise a
  // Postgres "invalid input syntax for type bigint" (a 500) instead of clamping.
  return Math.min(Math.floor(limit), MAX_LIMIT);
}

/** S3 "object absent" — HeadObject/GetObject 404 (NotFound / NoSuchKey). */
function isNotFound(err: unknown): boolean {
  const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
  return (
    e?.name === 'NotFound' ||
    e?.name === 'NoSuchKey' ||
    e?.$metadata?.httpStatusCode === 404
  );
}
