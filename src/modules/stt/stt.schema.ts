import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const SttPresignSchema = z.object({
  mime: z.string().trim().min(1).max(120),
  size: z.number().int().positive(),
});
export class SttPresignDto extends createZodDto(SttPresignSchema) {}

export const StartJobSchema = z.object({
  s3Key: z.string().trim().min(1).max(1024), // the key returned by /stt/presign
  language: z
    .string()
    .trim()
    .regex(
      /^[a-z]{2}(-[A-Z]{2})?$/,
      'language must be a BCP-47 code like en-GB',
    )
    .optional(),
});
export class StartJobDto extends createZodDto(StartJobSchema) {}
