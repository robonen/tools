import { describe, expect, it } from 'vitest';
import { swap } from '.';

describe('swap', () => {
  it('swap two items', () => {
    expect(swap(['a', 'b', 'c'], 0, 2)).toEqual(['c', 'b', 'a']);
  });

  it('return a copy unchanged when indices are equal', () => {
    const source = ['a', 'b'];
    const result = swap(source, 1, 1);
    expect(result).toEqual(['a', 'b']);
    expect(result).not.toBe(source);
  });

  it('return a copy unchanged for out-of-range indices', () => {
    expect(swap(['a', 'b'], 0, 9)).toEqual(['a', 'b']);
    expect(swap(['a', 'b'], -1, 1)).toEqual(['a', 'b']);
  });

  it('never mutate the source', () => {
    const source = ['a', 'b', 'c'];
    swap(source, 0, 2);
    expect(source).toEqual(['a', 'b', 'c']);
  });
});
