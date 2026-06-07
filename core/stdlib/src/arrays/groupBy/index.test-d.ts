import { describe, expectTypeOf, it } from 'vitest';
import { groupBy } from '.';

describe('groupBy', () => {
  it('keys the record by the union returned by the key function', () => {
    const result = groupBy([1, 2, 3], n => (n % 2 === 0 ? 'even' : 'odd'));

    expectTypeOf(result).toEqualTypeOf<Record<'even' | 'odd', number[]>>();
  });

  it('preserves the element type in the grouped arrays', () => {
    const result = groupBy([{ id: 1 }], item => item.id);

    expectTypeOf(result).toEqualTypeOf<Record<number, Array<{ id: number }>>>();
  });
});
