import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const AudioPresignSchema = z.object({
  filename: z.string().trim().min(1).max(255).optional(), // informational only
  mime: z.string().trim().min(1).max(120), // MediaRecorder.mimeType
  size: z.number().int().positive(), // bytes; capped against AUDIO_MAX_BYTES in the service
});
export class AudioPresignDto extends createZodDto(AudioPresignSchema) {}

// Client calls this after the direct S3 PUT resolves, echoing the key from presign,
// so the backend can confirm the object exists and mark the clip 'uploaded'.
export const AudioConfirmSchema = z.object({
  s3Key: z.string().trim().min(1).max(1024),
});
export class AudioConfirmDto extends createZodDto(AudioConfirmSchema) {}
