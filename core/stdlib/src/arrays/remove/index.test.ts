import { describe, expect, it } from 'vitest';
import { remove } from '.';

describe('remove', () => {
  it('remove an item by index', () => {
    expect(remove(['a', 'b', 'c'], 1)).toEqual(['a', 'c']);
  });

  it('remove the first and last items', () => {
    expect(remove(['a', 'b', 'c'], 0)).toEqual(['b', 'c']);
    expect(remove(['a', 'b', 'c'], 2)).toEqual(['a', 'b']);
  });

  it('return a copy unchanged for an out-of-range index', () => {
    const source = ['a', 'b'];
    const result = remove(source, 9);
    expect(result).toEqual(['a', 'b']);
    expect(result).not.toBe(source);
  });

  it('never mutate the source', () => {
    const source = ['a', 'b', 'c'];
    remove(source, 1);
    expect(source).toEqual(['a', 'b', 'c']);
  });
});
