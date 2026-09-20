import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/** One document: workspace file under docs/learn-take-rescue, inline text, or bytes. */
export const ExtractDocumentSchema = z
  .object({
    fileName: z.string().trim().min(1).max(255).optional(),
    filePath: z.string().trim().min(1).max(500).optional(),
    text: z.string().min(1).max(500_000).optional(),
    contentBase64: z.string().min(1).max(28_000_000).optional(),
  })
  .superRefine((d, ctx) => {
    const sources = [d.filePath, d.text, d.contentBase64].filter(
      Boolean,
    ).length;
    if (sources !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide exactly one of filePath, text, or contentBase64',
      });
    }
    if (!d.filePath && !d.fileName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'fileName is required when filePath is omitted',
      });
    }
  });

export const ExtractTake5Schema = z.object({
  documents: z.array(ExtractDocumentSchema).min(1).max(8),
});

export class ExtractTake5Dto extends createZodDto(ExtractTake5Schema) {}

export const Take5CheckSchema = z.object({
  priority: z.number().int().positive(),
  prompt: z.string().trim().min(1).max(2000),
});

export const CursorTokenUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cacheReadTokens: z.number().int().nonnegative(),
  cacheWriteTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
});

export const Take5ExtractResultSchema = z.object({
  checks: z.array(Take5CheckSchema).max(80),
  usage: CursorTokenUsageSchema.optional(),
});

export type Take5Check = z.infer<typeof Take5CheckSchema>;
export type CursorTokenUsage = z.infer<typeof CursorTokenUsageSchema>;
export type Take5ExtractResult = z.infer<typeof Take5ExtractResultSchema>;
export type ExtractDocument = z.infer<typeof ExtractDocumentSchema>;
