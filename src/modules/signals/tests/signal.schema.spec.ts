import { CreateSignalSchema } from '../signal.schema';

describe('CreateSignalSchema', () => {
  it('accepts a valid signal', () => {
    const parsed = CreateSignalSchema.parse({
      classification: 'be_aware',
      bodyText: '  Loose guard rail on scaffold  ',
    });
    expect(parsed.classification).toBe('be_aware');
    expect(parsed.bodyText).toBe('Loose guard rail on scaffold'); // trimmed
  });

  it.each(['good_practice', 'be_aware', 'needs_attention_now'])(
    'accepts classification %p',
    (classification) => {
      expect(
        CreateSignalSchema.safeParse({ classification, bodyText: 'x' }).success,
      ).toBe(true);
    },
  );

  it('rejects an unknown classification', () => {
    expect(
      CreateSignalSchema.safeParse({
        classification: 'stop_now',
        bodyText: 'x',
      }).success,
    ).toBe(false);
  });

  it('rejects empty / whitespace-only body text', () => {
    expect(
      CreateSignalSchema.safeParse({ classification: 'be_aware', bodyText: '' })
        .success,
    ).toBe(false);
    expect(
      CreateSignalSchema.safeParse({
        classification: 'be_aware',
        bodyText: '   ',
      }).success,
    ).toBe(false);
  });

  it('rejects body text over 2000 chars', () => {
    expect(
      CreateSignalSchema.safeParse({
        classification: 'be_aware',
        bodyText: 'a'.repeat(2001),
      }).success,
    ).toBe(false);
  });
});
