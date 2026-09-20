import { execFile } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ffmpegStatic from 'ffmpeg-static';
import type { ExpressionBuilder, Kysely } from 'kysely';

import { APP_DB } from '../../database/db.provider';
import type { DB } from '../../database/schema';
import { AppLoggerService } from '../../logging/app-logger.service';
import { ffmpegTranscodeArgs, playbackKeyFor } from './playback.util';
import type { Uploader } from './uploads.service';

const execFileAsync = promisify(execFile);

// Product constants (not env config).
const FFMPEG_TIMEOUT_MS = 300_000; // transcoding is heavier than a frame grab
const SWEEP_BATCH = 3; // rows per sweep tick (transcode is CPU-heavy)

export interface SweepResult {
  processed: number;
  ready: number;
  failed: number;
}

/**
 * Transcodes each completed video into a universally streamable rendition: pulls
 * the object from S3, re-encodes it to an H.264/AAC MP4 with +faststart (see
 * playback.util), and stores it beside the original (kept as the master). Runs off
 * the request path. The upload flow calls transcodeNow() the MOMENT a session
 * completes, so a new video is streamable within seconds; the PlaybackSweeper is
 * only a retry net for kicks that failed (playback_attempts > 0), which also means
 * it never re-processes older/pre-existing uploads. Idempotent (deterministic key)
 * and retry-capped.
 */
@Injectable()
export class PlaybackService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly ffmpegPath: string | null;
  private readonly ffmpegThreads: number;
  private readonly maxAttempts: number;
  private readonly urlTtlSec: number;

  constructor(
    @Inject(APP_DB) private readonly db: Kysely<DB>,
    config: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(PlaybackService.name);
    this.bucket = config.getOrThrow<string>('uploads.s3Bucket');
    this.maxAttempts = config.getOrThrow<number>('playback.maxAttempts');
    this.ffmpegThreads = config.getOrThrow<number>('playback.ffmpegThreads');
    this.urlTtlSec = config.getOrThrow<number>('uploads.urlTtlSeconds');
    // Configured ffmpeg wins; else the bundled ffmpeg-static binary.
    this.ffmpegPath = config.get<string>('playback.ffmpegPath') ?? ffmpegStatic;

    const accessKeyId = config.get<string>('aws.accessKeyId');
    const secretAccessKey = config.get<string>('aws.secretAccessKey');
    this.s3 = new S3Client({
      region: config.getOrThrow<string>('aws.region'),
      endpoint: config.get<string>('aws.s3Endpoint'),
      forcePathStyle:
        config.getOrThrow<string>('aws.s3ForcePathStyle') === 'true',
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    });
    if (!this.ffmpegPath) {
      this.logger.warn(
        'No ffmpeg binary resolved (ffmpeg-static missing and FFMPEG_PATH unset); playback transcoding will fail.',
        `PlaybackService.constructor`,
      );
    }
  }

  /**
   * Retry net: re-transcode uploads whose immediate kick FAILED (playback_attempts
   * between 1 and the cap). Fresh completions (attempts = 0) are handled by
   * transcodeNow(); requiring attempts > 0 here also means the sweep never touches
   * older/pre-existing uploads that were never kicked.
   */
  async transcodePending(): Promise<SweepResult> {
    const rows = await this.db
      .selectFrom('upload_session')
      .select(['id', 's3_key', 'playback_attempts'])
      .where('status', '=', 'completed')
      .where('playback_status', '=', 'pending')
      .where('playback_attempts', '>', 0) // retry only; fresh + older rows are not swept
      .where('playback_attempts', '<', this.maxAttempts)
      .orderBy('completed_at', 'asc')
      .limit(SWEEP_BATCH)
      .execute();

    let ready = 0;
    let failed = 0;
    for (const row of rows) {
      const ok = await this.transcodeOne(
        row.id,
        row.s3_key,
        row.playback_attempts,
      );
      if (ok) ready++;
      else failed++;
    }
    return { processed: rows.length, ready, failed };
  }

  /**
   * Fire-and-forget: transcode a just-completed upload immediately, off the request
   * path — the upload flow calls this the moment a session flips to completed, so a
   * new video is streamable within seconds instead of waiting for a poll. Errors are
   * swallowed; a failed attempt leaves the row at playback_attempts > 0 for the
   * sweep to retry. `id`/`s3Key` come from the completing upload_session row.
   */
  transcodeNow(id: number, s3Key: string): void {
    void this.transcodeOne(id, s3Key, 0).catch((err) => {
      this.logger.error(
        `immediate transcode kick failed for upload ${id}: ${errMessage(err)}`,
        { err },
        `PlaybackService.transcodeNow`,
      );
    });
  }

  private async transcodeOne(
    id: number,
    s3Key: string,
    attempts: number,
  ): Promise<boolean> {
    try {
      const key = await this.render(s3Key);
      await this.db
        .updateTable('upload_session')
        .set({ playback_key: key, playback_status: 'ready' })
        .where('id', '=', id)
        .execute();
      return true;
    } catch (err) {
      const next = attempts + 1;
      await this.db
        .updateTable('upload_session')
        .set({
          playback_attempts: next,
          // Give up after the cap; otherwise leave 'pending' for another try.
          playback_status: next >= this.maxAttempts ? 'failed' : 'pending',
        })
        .where('id', '=', id)
        .execute();
      this.logger.warn(
        `playback transcode for upload ${id} failed (attempt ${next}/${this.maxAttempts}): ${errMessage(err)}`,
        { err },
        `PlaybackService.transcodeOne`,
      );
      return false;
    }
  }

  /** Download -> ffmpeg transcode -> upload the MP4. Returns the playback key. */
  private async render(s3Key: string): Promise<string> {
    if (!this.ffmpegPath) throw new Error('ffmpeg binary not available');
    const dir = await mkdtemp(join(tmpdir(), 'safein-play-'));
    const inPath = join(dir, 'in');
    const outPath = join(dir, 'out.mp4');
    try {
      await this.downloadTo(s3Key, inPath);
      await execFileAsync(
        this.ffmpegPath,
        ffmpegTranscodeArgs(inPath, outPath, this.ffmpegThreads),
        { timeout: FFMPEG_TIMEOUT_MS },
      );
      const key = playbackKeyFor(s3Key);
      // Upload via lib-storage (multipart): it streams from disk with bounded
      // memory AND retries per-part on a transient S3 error. A plain PutObject
      // with a file stream can't be retried (the stream isn't rewindable), so one
      // blip would waste the whole transcode; multipart also lifts the 5 GB cap.
      await new Upload({
        client: this.s3,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: createReadStream(outPath),
          ContentType: 'video/mp4',
        },
      }).done();
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

  /** Serving: a short-lived presigned GET for a READY rendition, owner-scoped. */
  async playbackUrl(
    actor: Uploader | null,
    token: string,
  ): Promise<{ url: string }> {
    const row = await this.db
      .selectFrom('upload_session')
      .select(['playback_key', 'playback_status'])
      .where('session_token', '=', token)
      .where(this.ownedBy(actor))
      .executeTakeFirst();
    if (!row) throw new NotFoundException('Upload not found.');
    if (row.playback_status !== 'ready' || !row.playback_key) {
      throw new NotFoundException('Streamable video not available yet.');
    }
    const url = await getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: row.playback_key }),
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
