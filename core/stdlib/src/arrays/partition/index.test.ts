import { describe, expect, it } from 'vitest';
import { partition } from '.';

describe('partition', () => {
  it('split by a predicate into [matching, rest]', () => {
    expect(partition([1, 2, 3, 4], n => n % 2 === 0)).toEqual([[2, 4], [1, 3]]);
  });

  it('preserve order within each partition', () => {
    expect(partition([5, 1, 4, 2, 3], n => n > 2)).toEqual([[5, 4, 3], [1, 2]]);
  });

  it('pass the index to the predicate', () => {
    expect(partition(['a', 'b', 'c', 'd'], (_, i) => i < 2)).toEqual([['a', 'b'], ['c', 'd']]);
  });

  it('handle all-matching and none-matching', () => {
    expect(partition([1, 2, 3], () => true)).toEqual([[1, 2, 3], []]);
    expect(partition([1, 2, 3], () => false)).toEqual([[], [1, 2, 3]]);
  });

  it('work with a type guard', () => {
    const mixed: Array<string | number> = ['a', 1, 'b', 2];
    const [strings, numbers] = partition(mixed, (v): v is string => typeof v === 'string');

    expect(strings).toEqual(['a', 'b']);
    expect(numbers).toEqual([1, 2]);
  });
});
