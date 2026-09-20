import { z } from 'zod';

export const sendEmailInputSchema = z
  .object({
    to: z.union([z.string().email(), z.array(z.string().email()).min(1)]),
    subject: z.string().min(1).max(998),
    text: z.string().min(1).optional(),
    html: z.string().min(1).optional(),
    replyTo: z.string().email().optional(),
  })
  .refine((value) => Boolean(value.text || value.html), {
    message: 'Either text or html body is required',
  });

export type SendEmailInput = z.infer<typeof sendEmailInputSchema>;

export type SendEmailResult = {
  messageId: string;
};
