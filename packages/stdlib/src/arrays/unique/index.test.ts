import { describe, it, expect } from 'vitest';
import { unique } from '.';

describe('unique', () => {
  it('return an array with unique numbers', () => {
    const result = unique([1, 2, 3, 3, 4, 5, 5, 6]);

    expect(result).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('return an array with unique objects based on id', () => {
    const result = unique(
      [{ id: 1 }, { id: 2 }, { id: 1 }],
      (item) => item.id,
    );

    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('return the same array if all elements are unique', () => {
    const result = unique([1, 2, 3, 4, 5]);

    expect(result).toEqual([1, 2, 3, 4, 5]);
  });

  it('handle arrays with different types of values', () => {
    const result = unique([1, '1', 2, '2', 2, 3, '3']);

    expect(result).toEqual([1, '1', 2, '2', 3, '3']);
  });

  it('handle arrays with symbols', () => {
    const sym1 = Symbol('a');
    const sym2 = Symbol('b');
    const result = unique([sym1, sym2, sym1]);
    
    expect(result).toEqual([sym1, sym2]);
  });

  it('return an empty array when given an empty array', () => {
    const result = unique([]);

    expect(result).toEqual([]);
  });
});