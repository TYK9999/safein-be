import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * The single request body for POST /uploads/next. Its shape differs by whether
 * `sessionId` is present:
 *   - absent  -> first call: filename/mime/size/chunkSize/chunkCount required
 *   - present -> confirm call: chunkNumber required (+ eTag on a real chunk)
 *
 * Zod only enforces types/bounds here; the presence-based required-field and
 * semantic checks (mime allow-list, chunk-plan consistency) live in the service
 * so they can return the spec's { code, message } error bodies (§6).
 */
export const UploadNextSchema = z.object({
  // First-call fields.
  filename: z.string().trim().min(1).max(255).optional(),
  mime: z.string().trim().min(1).max(120).optional(),
  size: z.number().int().min(0).optional(),
  chunkSize: z.number().int().positive().optional(),
  chunkCount: z.number().int().min(1).optional(),

  // Confirm-call fields.
  sessionId: z.string().trim().min(1).max(80).optional(),
  chunkNumber: z.number().int().min(0).optional(), // 0 = resume (nothing confirmed yet)
  eTag: z.string().trim().min(1).max(256).optional(),
});
export class UploadNextDto extends createZodDto(UploadNextSchema) {}
