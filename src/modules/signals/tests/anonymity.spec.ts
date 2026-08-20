import { presentAuthor } from '../signal.present';
import { CreateSignalSchema } from '../signal.schema';

describe('presentAuthor', () => {
  it('shows the author when not anonymous', () => {
    expect(presentAuthor(false, 7, 'Sam', 'Rivera')).toEqual({
      id: 7,
      firstName: 'Sam',
      lastName: 'Rivera',
    });
  });

  it('hides the author when anonymous', () => {
    expect(presentAuthor(true, 7, 'Sam', 'Rivera')).toBeNull();
  });
});

describe('CreateSignalSchema — anonymous flag', () => {
  it('defaults anonymous to false', () => {
    const parsed = CreateSignalSchema.parse({
      classification: 'be_aware',
      bodyText: 'x',
    });
    expect(parsed.anonymous).toBe(false);
  });

  it('accepts anonymous: true', () => {
    const parsed = CreateSignalSchema.parse({
      classification: 'be_aware',
      bodyText: 'x',
      anonymous: true,
    });
    expect(parsed.anonymous).toBe(true);
  });

  it('rejects a non-boolean anonymous', () => {
    expect(
      CreateSignalSchema.safeParse({
        classification: 'be_aware',
        bodyText: 'x',
        anonymous: 'yes',
      }).success,
    ).toBe(false);
  });
});
