import { describe, expect, it } from 'vitest';
import { toArray } from '.';

describe('toArray', () => {
  it('wrap a single value into an array', () => {
    expect(toArray(1)).toEqual([1]);
    expect(toArray('a')).toEqual(['a']);
    expect(toArray(false)).toEqual([false]);
    expect(toArray(0)).toEqual([0]);
  });

  it('return arrays as-is (same reference, no copy)', () => {
    const arr = [1, 2, 3];
    expect(toArray(arr)).toBe(arr);
  });

  it('treat null and undefined as empty', () => {
    expect(toArray(undefined)).toEqual([]);
    expect(toArray(null)).toEqual([]);
  });

  it('preserve empty arrays', () => {
    const empty: number[] = [];
    expect(toArray(empty)).toBe(empty);
  });
});
