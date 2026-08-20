import { z } from 'zod';

export const RiskTypeSchema = z.enum([
  'confined_space',
  'working_at_height',
  'hot_work',
  'electrical',
  'general',
]);

export const DestinationTypeSchema = z.enum([
  'pulse',
  'behaviour_signal',
  'rescue_plan',
]);

export const CreateQrSchema = z.object({
  site: z.string().min(1),

  asset: z.string().min(1),

  taskType: z.string().min(1),

  riskType: RiskTypeSchema,

  destinationTypes: z.array(DestinationTypeSchema).min(1),

  active: z.boolean().optional().default(true),

  context: z.string().min(1),
});

export type CreateQr = z.infer<typeof CreateQrSchema>;
