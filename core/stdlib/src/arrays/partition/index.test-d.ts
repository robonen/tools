import { describe, expectTypeOf, it } from 'vitest';
import { partition } from '.';

describe('partition', () => {
  it('returns a tuple of two arrays of the element type', () => {
    const result = partition([1, 2, 3], n => n > 1);

    expectTypeOf(result).toEqualTypeOf<[number[], number[]]>();
  });

  it('narrows both partitions with a type guard', () => {
    const mixed: Array<string | number> = ['a', 1];
    const result = partition(mixed, (v): v is string => typeof v === 'string');

    expectTypeOf(result).toEqualTypeOf<[string[], number[]]>();
  });
});
