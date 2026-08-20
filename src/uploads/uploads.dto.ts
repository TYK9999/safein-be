import { z } from 'zod';

// ─── Allowed MIME types ────────────────────────────────────────────────────────
export const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
  'video/x-matroska',
] as const;

// ─── POST /uploads/initiate — Request DTO ─────────────────────────────────────
export const InitiateUploadSchema = z.object({
  /** Client-supplied original filename (used only for Content-Disposition hints). */
  filename: z.string().min(1),

  /** Total file size in bytes. */
  size: z.number().int().positive(),

  /** MIME type of the recording. */
  mime: z.enum(ALLOWED_VIDEO_MIME_TYPES as unknown as [string, ...string[]]),

  /** Bytes per part the client intends to send (used to compute part count). */
  partSize: z
    .number()
    .int()
    .min(5 * 1024 * 1024), // S3 minimum is 5 MB

  /** Measured clip duration in seconds – must not exceed 30. */
  durationSec: z.number().positive(),
});

export type InitiateUploadDto = z.infer<typeof InitiateUploadSchema>;

// ─── Part presign info (shared) ────────────────────────────────────────────────
export interface PartPresignInfo {
  partNumber: number;
  url: string;
}

// ─── POST /uploads/initiate — Response DTO ────────────────────────────────────
export interface InitiateUploadResponseDto {
  uploadId: string;
  key: string;
  partSize: number;
  partCount: number;
  parts: PartPresignInfo[];
  urlExpiresInSec: number;
}

// ─── POST /uploads/parts — Request DTO (re-presign expired part URLs) ─────────
export const ResignPartsSchema = z.object({
  /** The S3 multipart UploadId returned by POST /uploads/initiate. */
  uploadId: z.string().min(1),

  /** The server-chosen S3 object key returned by POST /uploads/initiate. */
  key: z.string().min(1),

  /** Part numbers the client still needs to upload (1-based). */
  partNumbers: z.array(z.number().int().min(1).max(10000)).min(1).max(10000),
});

export type ResignPartsDto = z.infer<typeof ResignPartsSchema>;

// ─── POST /uploads/parts — Response DTO ───────────────────────────────────────
export interface ResignPartsResponseDto {
  parts: PartPresignInfo[];
  urlExpiresInSec: number;
}

// ─── GET /uploads/:uploadId/parts — Response DTO ──────────────────────────────
export interface UploadedPartInfo {
  /** 1-based part number. */
  partNumber: number;
  /** ETag returned by S3 when the part was uploaded. */
  eTag: string;
  /** Part size in bytes as reported by S3. */
  size: number;
}

export interface ListUploadedPartsResponseDto {
  uploadId: string;
  key: string;
  parts: UploadedPartInfo[];
}

// ─── POST /uploads/complete — Request DTO ─────────────────────────────────────
export const CompleteUploadSchema = z.object({
  /** S3 multipart UploadId. */
  uploadId: z.string().min(1),

  /** Server-chosen S3 object key. */
  key: z.string().min(1),

  /**
   * All completed parts in ascending partNumber order.
   * S3 requires ascending order; we validate and sort server-side for safety.
   */
  parts: z
    .array(
      z.object({
        partNumber: z.number().int().min(1).max(10000),
        eTag: z.string().min(1),
      }),
    )
    .min(1),
});

export type CompleteUploadDto = z.infer<typeof CompleteUploadSchema>;

// ─── POST /uploads/complete — Response DTO ────────────────────────────────────
export interface CompleteUploadResponseDto {
  videoId: string;
  key: string;
  location: string | null;
  status: 'completed';
}

// ─── POST /uploads/abort — Request DTO ────────────────────────────────────────
export const AbortUploadSchema = z.object({
  uploadId: z.string().min(1),
  key: z.string().min(1),
});

export type AbortUploadDto = z.infer<typeof AbortUploadSchema>;

// ─── POST /uploads/abort — Response DTO ───────────────────────────────────────
export interface AbortUploadResponseDto {
  status: 'aborted';
}
