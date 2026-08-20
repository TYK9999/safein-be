import {
  ConflictException,
  GoneException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  ListPartsCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  NoSuchUpload,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Kysely } from 'kysely';
import { randomUUID } from 'crypto';

import { DATABASE } from '../database/database.provider';
import { Database } from '../database/database.types';
import { S3_CLIENT } from './s3.provider';
import {
  InitiateUploadDto,
  InitiateUploadResponseDto,
  ALLOWED_VIDEO_MIME_TYPES,
  ResignPartsDto,
  ResignPartsResponseDto,
  ListUploadedPartsResponseDto,
  CompleteUploadDto,
  CompleteUploadResponseDto,
  AbortUploadDto,
  AbortUploadResponseDto,
} from './uploads.dto';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    @Inject(DATABASE)
    private readonly db: Kysely<Database>,

    @Inject(S3_CLIENT)
    private readonly s3: S3Client,

    private readonly config: ConfigService,
  ) {}

  // ─── POST /uploads/initiate ────────────────────────────────────────────────

  async initiateUpload(
    dto: InitiateUploadDto,
  ): Promise<InitiateUploadResponseDto> {
    this.validateRequest(dto);

    const bucket = this.config.get<string>('aws.s3Bucket')!;
    const urlExpiresInSec = this.config.get<number>('upload.urlExpiresInSec')!;

    // Server-chosen S3 key — never trust the client path
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const ext = this.extractExtension(dto.filename, dto.mime);
    const key = `videos/${year}/${month}/${randomUUID()}${ext}`;

    // 1. CreateMultipartUpload
    const createCmd = new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      ContentType: dto.mime,
    });

    this.logger.log({ key, mime: dto.mime }, 'Creating S3 multipart upload');
    const { UploadId: uploadId } = await this.s3.send(createCmd);

    if (!uploadId) {
      throw new Error('S3 did not return an UploadId');
    }

    // 2. Presign one UploadPart URL per part
    const partCount = Math.ceil(dto.size / dto.partSize);
    const parts = await this.presignParts(
      bucket,
      key,
      uploadId,
      partCount,
      urlExpiresInSec,
    );

    // 3. Persist upload metadata row
    await this.db
      .insertInto('video_uploads')
      .values({
        key,
        upload_id: uploadId,
        size: dto.size,
        mime: dto.mime,
        duration_sec: dto.durationSec,
        status: 'initiated',
        video_id: null,
        location: null,
        completed_at: null,
      })
      .executeTakeFirstOrThrow();

    this.logger.log({ uploadId, key, partCount }, 'Multipart upload initiated');

    return {
      uploadId,
      key,
      partSize: dto.partSize,
      partCount,
      parts,
      urlExpiresInSec,
    };
  }

  // ─── POST /uploads/parts ── re-presign expired URLs (resume support) ────────

  async resignParts(dto: ResignPartsDto): Promise<ResignPartsResponseDto> {
    const bucket = this.config.get<string>('aws.s3Bucket')!;
    const urlExpiresInSec = this.config.get<number>('upload.urlExpiresInSec')!;

    // 1. Verify the uploadId/key exist in our DB and are still active
    const row = await this.db
      .selectFrom('video_uploads')
      .selectAll()
      .where('upload_id', '=', dto.uploadId)
      .where('key', '=', dto.key)
      .executeTakeFirst();

    if (!row) {
      throw new NotFoundException(
        `No upload found for uploadId="${dto.uploadId}" and key="${dto.key}".`,
      );
    }

    if (row.status !== 'initiated') {
      throw new GoneException(
        `Upload "${dto.uploadId}" is no longer active (status: ${row.status}).`,
      );
    }

    // 2. Re-presign requested parts — catch S3 NoSuchUpload → 410 Gone
    let parts: { partNumber: number; url: string }[];

    try {
      parts = await Promise.all(
        dto.partNumbers.map((partNumber) => {
          const cmd = new UploadPartCommand({
            Bucket: bucket,
            Key: dto.key,
            UploadId: dto.uploadId,
            PartNumber: partNumber,
          });
          return getSignedUrl(this.s3, cmd, {
            expiresIn: urlExpiresInSec,
          }).then((url) => ({ partNumber, url }));
        }),
      );
    } catch (err) {
      if (err instanceof NoSuchUpload) {
        await this.markAborted(dto.uploadId);
        throw new GoneException(
          `Multipart upload "${dto.uploadId}" no longer exists on S3. Please restart the upload.`,
        );
      }
      throw err;
    }

    this.logger.log(
      { uploadId: dto.uploadId, key: dto.key, parts: dto.partNumbers },
      'Re-presigned part URLs',
    );

    return { parts, urlExpiresInSec };
  }

  // ─── GET /uploads/:uploadId/parts ── list already-uploaded parts ─────────────

  async listUploadedParts(
    uploadId: string,
    key: string,
  ): Promise<ListUploadedPartsResponseDto> {
    const bucket = this.config.get<string>('aws.s3Bucket')!;

    // 1. Verify ownership / existence in DB
    const row = await this.db
      .selectFrom('video_uploads')
      .selectAll()
      .where('upload_id', '=', uploadId)
      .where('key', '=', key)
      .executeTakeFirst();

    if (!row) {
      throw new NotFoundException(
        `No upload found for uploadId="${uploadId}" and key="${key}".`,
      );
    }

    if (row.status !== 'initiated') {
      throw new GoneException(
        `Upload "${uploadId}" is no longer active (status: ${row.status}).`,
      );
    }

    // 2. Paginate through ListParts (S3 returns max 1 000 per call)
    const uploadedParts: { partNumber: number; eTag: string; size: number }[] =
      [];
    let partNumberMarker: string | undefined;

    try {
      do {
        const cmd = new ListPartsCommand({
          Bucket: bucket,
          Key: key,
          UploadId: uploadId,
          PartNumberMarker: partNumberMarker,
        });

        const resp = await this.s3.send(cmd);

        for (const part of resp.Parts ?? []) {
          uploadedParts.push({
            partNumber: part.PartNumber ?? 0,
            eTag: part.ETag ?? '',
            size: part.Size ?? 0,
          });
        }

        partNumberMarker = resp.IsTruncated
          ? String(resp.NextPartNumberMarker ?? '')
          : undefined;
      } while (partNumberMarker !== undefined);
    } catch (err) {
      if (err instanceof NoSuchUpload) {
        await this.markAborted(uploadId);
        throw new GoneException(
          `Multipart upload "${uploadId}" no longer exists on S3. Please restart the upload.`,
        );
      }
      throw err;
    }

    this.logger.log(
      { uploadId, key, partCount: uploadedParts.length },
      'Listed uploaded parts',
    );

    return { uploadId, key, parts: uploadedParts };
  }

  // ─── POST /uploads/complete ────────────────────────────────────────────────

  async completeUpload(
    dto: CompleteUploadDto,
  ): Promise<CompleteUploadResponseDto> {
    const bucket = this.config.get<string>('aws.s3Bucket')!;
    const cdnBaseUrl = this.config.get<string | null>('aws.cdnBaseUrl') ?? null;

    // 1. Load DB row
    const row = await this.db
      .selectFrom('video_uploads')
      .selectAll()
      .where('upload_id', '=', dto.uploadId)
      .where('key', '=', dto.key)
      .executeTakeFirst();

    if (!row) {
      throw new NotFoundException(
        `No upload found for uploadId="${dto.uploadId}" and key="${dto.key}".`,
      );
    }

    // 2. Idempotency — already completed: return the same 200 result
    if (row.status === 'completed') {
      this.logger.log(
        { uploadId: dto.uploadId },
        'CompleteUpload called on already-completed upload (idempotent)',
      );
      return {
        videoId: row.video_id ?? row.id,
        key: row.key,
        location: row.location,
        status: 'completed',
      };
    }

    if (row.status === 'aborted') {
      throw new GoneException(
        `Upload "${dto.uploadId}" has been aborted and cannot be completed.`,
      );
    }

    // 3. Sort parts ascending (S3 requires it; client should send sorted but we enforce)
    const sortedParts = [...dto.parts].sort(
      (a, b) => a.partNumber - b.partNumber,
    );

    // 4. CompleteMultipartUpload — map to S3 CompletedPart shape
    try {
      await this.s3.send(
        new CompleteMultipartUploadCommand({
          Bucket: bucket,
          Key: dto.key,
          UploadId: dto.uploadId,
          MultipartUpload: {
            Parts: sortedParts.map((p) => ({
              PartNumber: p.partNumber,
              ETag: p.eTag,
            })),
          },
        }),
      );
    } catch (err) {
      // S3 rejects with InvalidPart (wrong ETag / missing part) or NoSuchUpload
      const errName = (err as { name?: string }).name ?? '';
      if (errName === 'InvalidPart' || err instanceof NoSuchUpload) {
        // Tell the client to re-check its parts and retry
        throw new HttpException(
          { code: 'PART_MISMATCH', message: (err as Error).message },
          HttpStatus.CONFLICT,
        );
      }
      throw err;
    }

    // 5. Build location URL  (CDN if configured, otherwise direct S3 HTTPS)
    const location = cdnBaseUrl
      ? `${cdnBaseUrl.replace(/\/$/, '')}/${dto.key}`
      : `https://${bucket}.s3.amazonaws.com/${dto.key}`;

    const videoId = randomUUID();
    const now = new Date();

    // 6. Update DB row — set completed status, location, video_id, completed_at
    await this.db
      .updateTable('video_uploads')
      .set({
        status: 'completed',
        video_id: videoId,
        location,
        completed_at: now,
      })
      .where('upload_id', '=', dto.uploadId)
      .execute();

    this.logger.log(
      { uploadId: dto.uploadId, key: dto.key, videoId, location },
      'Multipart upload completed',
    );

    return { videoId, key: dto.key, location, status: 'completed' };
  }

  // ─── POST /uploads/abort ───────────────────────────────────────────────────

  async abortUpload(dto: AbortUploadDto): Promise<AbortUploadResponseDto> {
    const bucket = this.config.get<string>('aws.s3Bucket')!;

    // 1. Load DB row — idempotent: unknown or already-aborted both return 200
    const row = await this.db
      .selectFrom('video_uploads')
      .select(['status', 'upload_id'])
      .where('upload_id', '=', dto.uploadId)
      .where('key', '=', dto.key)
      .executeTakeFirst();

    if (!row || row.status === 'aborted') {
      this.logger.log(
        { uploadId: dto.uploadId },
        'AbortUpload: already aborted or not found (idempotent)',
      );
      return { status: 'aborted' };
    }

    if (row.status === 'completed') {
      // Completed uploads cannot be aborted — the object already exists in S3
      throw new ConflictException(
        `Upload "${dto.uploadId}" has already been completed and cannot be aborted.`,
      );
    }

    // 2. Abort on S3 — frees all stored parts (cost-critical)
    try {
      await this.s3.send(
        new AbortMultipartUploadCommand({
          Bucket: bucket,
          Key: dto.key,
          UploadId: dto.uploadId,
        }),
      );
    } catch (err) {
      // If S3 says it doesn't exist, the upload is already gone — treat as success
      if (!(err instanceof NoSuchUpload)) {
        throw err;
      }
      this.logger.warn(
        { uploadId: dto.uploadId },
        'AbortUpload: S3 NoSuchUpload (already expired/aborted on S3)',
      );
    }

    // 3. Mark aborted in DB
    await this.markAborted(dto.uploadId);

    this.logger.log(
      { uploadId: dto.uploadId, key: dto.key },
      'Multipart upload aborted',
    );

    return { status: 'aborted' };
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  /** Presign N consecutive part URLs (partNumber 1..count) in parallel. */
  private presignParts(
    bucket: string,
    key: string,
    uploadId: string,
    count: number,
    expiresIn: number,
  ) {
    return Promise.all(
      Array.from({ length: count }, (_, i) => {
        const partNumber = i + 1;
        const cmd = new UploadPartCommand({
          Bucket: bucket,
          Key: key,
          UploadId: uploadId,
          PartNumber: partNumber,
        });
        return getSignedUrl(this.s3, cmd, { expiresIn }).then((url) => ({
          partNumber,
          url,
        }));
      }),
    );
  }

  /** Mark a video_uploads row as aborted by uploadId. */
  private async markAborted(uploadId: string): Promise<void> {
    await this.db
      .updateTable('video_uploads')
      .set({ status: 'aborted' })
      .where('upload_id', '=', uploadId)
      .execute();
  }

  private validateRequest(dto: InitiateUploadDto): void {
    const maxDurationSec = this.config.get<number>(
      'upload.maxClipDurationSec',
    )!;
    const maxSizeBytes = this.config.get<number>('upload.maxSizeBytes')!;

    if (dto.durationSec > maxDurationSec) {
      throw new UnprocessableEntityException(
        `Clip duration ${dto.durationSec}s exceeds the maximum allowed ${maxDurationSec}s.`,
      );
    }

    if (dto.size > maxSizeBytes) {
      throw new UnprocessableEntityException(
        `Upload size ${dto.size} bytes exceeds the maximum allowed ${maxSizeBytes} bytes.`,
      );
    }

    if (!(ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(dto.mime)) {
      throw new UnprocessableEntityException(
        `MIME type "${dto.mime}" is not allowed. Allowed types: ${ALLOWED_VIDEO_MIME_TYPES.join(', ')}`,
      );
    }
  }

  private extractExtension(filename: string, mime: string): string {
    const fromFilename = filename.includes('.')
      ? `.${filename.split('.').pop()!.toLowerCase()}`
      : '';

    if (!fromFilename) {
      const mimeExtMap: Record<string, string> = {
        'video/mp4': '.mp4',
        'video/quicktime': '.mov',
        'video/webm': '.webm',
        'video/x-msvideo': '.avi',
        'video/x-matroska': '.mkv',
      };
      return mimeExtMap[mime] ?? '';
    }

    return fromFilename;
  }
}
