import { describe, expect, it } from 'vitest';
import { zip } from '.';

describe('zip', () => {
  it('zip two arrays of equal length', () => {
    expect(zip([1, 2, 3], ['a', 'b', 'c'])).toEqual([[1, 'a'], [2, 'b'], [3, 'c']]);
  });

  it('zip three arrays', () => {
    expect(zip([1, 2], ['a', 'b'], [true, false])).toEqual([[1, 'a', true], [2, 'b', false]]);
  });

  it('truncate to the shortest array', () => {
    expect(zip([1, 2, 3], ['a'])).toEqual([[1, 'a']]);
    expect(zip([1], ['a', 'b', 'c'])).toEqual([[1, 'a']]);
  });

  it('zip a single array into singletons', () => {
    expect(zip([1, 2, 3])).toEqual([[1], [2], [3]]);
  });

  it('return an empty array when an input is empty', () => {
    expect(zip([1, 2, 3], [])).toEqual([]);
  });

  it('return an empty array with no arguments', () => {
    expect((zip as () => unknown[])()).toEqual([]);
  });

  it('zip four and five arrays', () => {
    expect(zip([1], ['a'], [true], [9])).toEqual([[1, 'a', true, 9]]);
    expect(zip([1, 2], ['a', 'b'], [true, false], [9, 8], ['x', 'y']))
      .toEqual([[1, 'a', true, 9, 'x'], [2, 'b', false, 8, 'y']]);
  });
});
