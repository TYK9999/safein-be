import {
  generateOtp,
  hashCredential,
  timingSafeEqualHex,
} from '../util/crypto.util';

describe('generateOtp', () => {
  it('produces a zero-padded numeric code of the requested length', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateOtp(6);
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it('honours a custom length', () => {
    expect(generateOtp(4)).toMatch(/^\d{4}$/);
    expect(generateOtp(8)).toMatch(/^\d{8}$/);
  });
});

describe('hashCredential', () => {
  const pepper = Buffer.from('unit-test-secret', 'utf8');

  it('returns 64 lowercase hex chars', () => {
    expect(hashCredential('123456', pepper)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic and input-sensitive', () => {
    expect(hashCredential('123456', pepper)).toBe(
      hashCredential('123456', pepper),
    );
    expect(hashCredential('123456', pepper)).not.toBe(
      hashCredential('123457', pepper),
    );
  });

  it('depends on the pepper', () => {
    const other = Buffer.from('different-secret', 'utf8');
    expect(hashCredential('123456', pepper)).not.toBe(
      hashCredential('123456', other),
    );
  });
});

describe('timingSafeEqualHex', () => {
  it('matches equal digests and rejects different ones', () => {
    const pepper = Buffer.from('s', 'utf8');
    const h = hashCredential('code', pepper);
    expect(timingSafeEqualHex(h, h)).toBe(true);
    expect(timingSafeEqualHex(h, hashCredential('nope', pepper))).toBe(false);
  });

  it('returns false for mismatched lengths instead of throwing', () => {
    expect(timingSafeEqualHex('abcd', 'ab')).toBe(false);
  });
});
