import {
  createHash,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';

/**
 * Hash a single-use credential (OTP code or magic-link token) for storage.
 * Salted with the KMS pepper family so a stolen database, lacking the pepper,
 * cannot reverse a code even where the space is small (OTP brute force is
 * additionally bounded by auth_token.attempt_count / max_attempts).
 * Returns 64 lowercase hex chars, matching ck_auth_token_hash_format.
 */
export function hashCredential(raw: string, pepper: Buffer): string {
  return createHash('sha256')
    .update(
      Buffer.concat([
        pepper,
        Buffer.from(':', 'utf8'),
        Buffer.from(raw, 'utf8'),
      ]),
    )
    .digest('hex');
}

/** SHA-256 lowercase hex of a UTF-8 string (unsalted; for cookie/device hashes). */
export function sha256Hex(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

/** A zero-padded numeric OTP of the given length (default 6). */
export function generateOtp(length = 6): string {
  const max = 10 ** length;
  return String(randomInt(0, max)).padStart(length, '0');
}

/** A URL-safe opaque magic-link token (32 random bytes, base64url). */
export function generateOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Constant-time comparison of two equal-length hex digests. */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
