import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CLASSIFICATIONS = [
  'good_practice',
  'be_aware',
  'needs_attention_now',
] as const;

export const CreateSignalSchema = z.object({
  classification: z.enum(CLASSIFICATIONS),
  bodyText: z.string().trim().min(1).max(2000),
  anonymous: z.boolean().optional().default(false),
});
export class CreateSignalDto extends createZodDto(CreateSignalSchema) {}

export const CloseSignalSchema = z.object({
  closeNote: z.string().trim().min(1).max(1000),
});
export class CloseSignalDto extends createZodDto(CloseSignalSchema) {}
