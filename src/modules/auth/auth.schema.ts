import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const email = z.string().trim().toLowerCase().pipe(z.email());

export const RegisterSchema = z.object({
  email,
  firstName: z.string().trim().min(1).max(60).optional(),
  lastName: z.string().trim().min(1).max(60).optional(),
});
export class RegisterDto extends createZodDto(RegisterSchema) {}

export const OtpRequestSchema = z.object({ email });
export class OtpRequestDto extends createZodDto(OtpRequestSchema) {}

export const OtpVerifySchema = z.object({
  email,
  code: z
    .string()
    .trim()
    .regex(/^\d{4,10}$/, 'OTP must be 4-10 digits.'),
});
export class OtpVerifyDto extends createZodDto(OtpVerifySchema) {}

export const MagicLinkRequestSchema = z.object({ email });
export class MagicLinkRequestDto extends createZodDto(MagicLinkRequestSchema) {}
