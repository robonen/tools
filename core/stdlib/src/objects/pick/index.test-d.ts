import { describe, expectTypeOf, it } from 'vitest';
import { pick } from '.';

interface Sample { a: number; b: string; c: boolean }

describe('pick', () => {
  it('narrows to a single picked key', () => {
    expectTypeOf(pick({ a: 1, b: 'x', c: true } as Sample, 'a')).toEqualTypeOf<Pick<Sample, 'a'>>();
  });

  it('narrows to multiple picked keys', () => {
    expectTypeOf(pick({ a: 1, b: 'x', c: true } as Sample, ['a', 'b'])).toEqualTypeOf<Pick<Sample, 'a' | 'b'>>();
  });
});
