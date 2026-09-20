import { z } from 'zod';

/** Basic E.164: + and 8–15 digits total after +. */
export const e164Schema = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, 'Phone must be E.164 (e.g. +14155552671)');

export const sendSmsInputSchema = z.object({
  toE164: e164Schema,
  body: z.string().min(1).max(1600),
});

export type SendSmsInput = z.infer<typeof sendSmsInputSchema>;

export type SendSmsResult = {
  messageId: string;
};
