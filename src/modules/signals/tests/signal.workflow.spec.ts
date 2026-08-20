import { transition } from '../signal.workflow';
import { CloseSignalSchema } from '../signal.schema';

describe('transition()', () => {
  it.each([
    ['open', 'acknowledge', 'apply'],
    ['acknowledged', 'acknowledge', 'noop'],
    ['closed', 'acknowledge', 'conflict'],
    ['open', 'close', 'apply'],
    ['acknowledged', 'close', 'apply'],
    ['closed', 'close', 'conflict'],
  ] as const)('%s + %s -> %s', (current, action, expected) => {
    expect(transition(current, action)).toBe(expected);
  });
});

describe('CloseSignalSchema', () => {
  it('requires a non-empty close note', () => {
    expect(
      CloseSignalSchema.safeParse({ closeNote: 'Barrier reinstated' }).success,
    ).toBe(true);
    expect(CloseSignalSchema.safeParse({ closeNote: '' }).success).toBe(false);
    expect(CloseSignalSchema.safeParse({ closeNote: '   ' }).success).toBe(
      false,
    );
    expect(CloseSignalSchema.safeParse({}).success).toBe(false);
  });
});
