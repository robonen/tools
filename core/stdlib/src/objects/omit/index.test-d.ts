import { describe, expectTypeOf, it } from 'vitest';
import { omit } from '.';

interface Sample { a: number; b: string; c: boolean }

describe('omit', () => {
  it('removes a single key from the type', () => {
    expectTypeOf(omit({ a: 1, b: 'x', c: true } as Sample, 'a')).toEqualTypeOf<Omit<Sample, 'a'>>();
  });

  it('removes multiple keys from the type', () => {
    expectTypeOf(omit({ a: 1, b: 'x', c: true } as Sample, ['a', 'b'])).toEqualTypeOf<Omit<Sample, 'a' | 'b'>>();
  });
});
