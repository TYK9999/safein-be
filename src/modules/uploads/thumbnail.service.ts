import { execFile } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ffmpegStatic from 'ffmpeg-static';
import { Kysely, type ExpressionBuilder } from 'kysely';
import sharp from 'sharp';

import { APP_DB } from '../../database/db.provider';
import type { DB } from '../../database/schema';
import { AppLoggerService } from '../../logging/app-logger.service';
import type { Uploader } from './uploads.service';
import { ffmpegThumbnailArgs, thumbnailKeyFor } from './thumbnail.util';

const execFileAsync = promisify(execFile);

// Product constants (not env config).
const FFMPEG_TIMEOUT_MS = 30_000; // kill a stuck/hostile ffmpeg
const THUMB_MAX_WIDTH = 640; // downscale cap (keeps aspect)
const THUMB_WEBP_QUALITY = 72;
const SWEEP_BATCH = 5; // rows processed per sweep tick

export interface SweepResult {
  processed: number;
  ready: number;
  failed: number;
}

/**
 * Generates a poster-frame thumbnail for each completed video: pulls the object
 * from S3, extracts a representative frame with ffmpeg, re-encodes it to a small
 * WebP with sharp (stripping metadata), and stores it beside the video. Runs off
 * the request path — the ThumbnailSweeper drives generatePending() on a timer.
 * Idempotent (deterministic key) and retry-capped.
 */
@Injectable()
export class ThumbnailService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly ffmpegPath: string | null;
  private readonly maxAttempts: number;
  private readonly urlTtlSec: number;

  constructor(
    @Inject(APP_DB) private readonly db: Kysely<DB>,
    config: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(ThumbnailService.name);
    this.bucket = config.getOrThrow<string>('uploads.s3Bucket');
    this.maxAttempts = config.getOrThrow<number>('thumbnail.maxAttempts');
    this.urlTtlSec = config.getOrThrow<number>('uploads.urlTtlSeconds');
    // Configured ffmpeg wins; else the bundled ffmpeg-static binary.
    this.ffmpegPath =
      config.get<string>('thumbnail.ffmpegPath') ?? ffmpegStatic;

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
    if (!this.ffmpegPath) {
      this.logger.warn(
        'No ffmpeg binary resolved (ffmpeg-static missing and FFMPEG_PATH unset); thumbnail generation will fail.',
        `ThumbnailService.constructor`,
      );
    }
  }

  /** Process one batch of completed-but-un-thumbnailed uploads. */
  async generatePending(): Promise<SweepResult> {
    const rows = await this.db
      .selectFrom('upload_session')
      .select(['id', 's3_key', 'thumbnail_attempts'])
      .where('status', '=', 'completed')
      .where('thumbnail_status', '=', 'pending')
      .where('thumbnail_attempts', '<', this.maxAttempts)
      .orderBy('completed_at', 'asc')
      .limit(SWEEP_BATCH)
      .execute();

    let ready = 0;
    let failed = 0;
    for (const row of rows) {
      const ok = await this.generateOne(
        row.id,
        row.s3_key,
        row.thumbnail_attempts,
      );
      if (ok) ready++;
      else failed++;
    }
    return { processed: rows.length, ready, failed };
  }

  private async generateOne(
    id: number,
    s3Key: string,
    attempts: number,
  ): Promise<boolean> {
    try {
      const key = await this.render(s3Key);
      await this.db
        .updateTable('upload_session')
        .set({ thumbnail_key: key, thumbnail_status: 'ready' })
        .where('id', '=', id)
        .execute();
      return true;
    } catch (err) {
      const next = attempts + 1;
      await this.db
        .updateTable('upload_session')
        .set({
          thumbnail_attempts: next,
          // Give up after the cap; otherwise leave 'pending' for another try.
          thumbnail_status: next >= this.maxAttempts ? 'failed' : 'pending',
        })
        .where('id', '=', id)
        .execute();
      this.logger.warn(
        `thumbnail for upload ${id} failed (attempt ${next}/${this.maxAttempts}): ${errMessage(err)}`,
        { err },
        `ThumbnailService.generateOne`,
      );
      return false;
    }
  }

  /** Download -> ffmpeg frame -> sharp WebP -> upload. Returns the thumbnail key. */
  private async render(s3Key: string): Promise<string> {
    if (!this.ffmpegPath) throw new Error('ffmpeg binary not available');
    const dir = await mkdtemp(join(tmpdir(), 'safein-thumb-'));
    const inPath = join(dir, 'in');
    const framePath = join(dir, 'frame.png');
    try {
      await this.downloadTo(s3Key, inPath);
      await execFileAsync(
        this.ffmpegPath,
        ffmpegThumbnailArgs(inPath, framePath),
        { timeout: FFMPEG_TIMEOUT_MS },
      );
      const webp = await sharp(framePath)
        .rotate() // honour any orientation metadata
        .resize({ width: THUMB_MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: THUMB_WEBP_QUALITY })
        .toBuffer();
      const key = thumbnailKeyFor(s3Key);
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: webp,
          ContentType: 'image/webp',
        }),
      );
      return key;
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  private async downloadTo(s3Key: string, dest: string): Promise<void> {
    const res = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: s3Key }),
    );
    await pipeline(res.Body as Readable, createWriteStream(dest));
  }

  /** Serving: a short-lived presigned GET for a READY thumbnail, owner-scoped. */
  async thumbnailUrl(
    actor: Uploader | null,
    token: string,
  ): Promise<{ url: string }> {
    const row = await this.db
      .selectFrom('upload_session')
      .select(['thumbnail_key', 'thumbnail_status'])
      .where('session_token', '=', token)
      .where(this.ownedBy(actor))
      .executeTakeFirst();
    if (!row) throw new NotFoundException('Upload not found.');
    if (row.thumbnail_status !== 'ready' || !row.thumbnail_key) {
      throw new NotFoundException('Thumbnail not available yet.');
    }
    const url = await getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: row.thumbnail_key }),
      { expiresIn: this.urlTtlSec },
    );
    return { url };
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

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
