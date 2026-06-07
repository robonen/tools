import { describe, expectTypeOf, it } from 'vitest';
import { toArray } from '.';

describe('toArray', () => {
  it('wraps a single value into an array of that type', () => {
    expectTypeOf(toArray(1)).toEqualTypeOf<number[]>();
  });

  it('returns an array input as the same element type', () => {
    expectTypeOf(toArray([1, 2, 3])).toEqualTypeOf<number[]>();
  });

  it('returns the element array type for a nullish input', () => {
    expectTypeOf(toArray<string>(undefined)).toEqualTypeOf<string[]>();
    expectTypeOf(toArray<number>(null)).toEqualTypeOf<number[]>();
  });
});
