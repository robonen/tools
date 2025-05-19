import { describe, it, expect } from 'vitest';
import { last } from '.';

describe('last', () => {
  it('return the last element of a non-empty array', () => {
    expect(last([1, 2, 3, 4, 5])).toBe(5);
    expect(last(['a', 'b', 'c'])).toBe('c');
  });

  it('return undefined if the array is empty and no default value is provided', () => {
    expect(last([])).toBeUndefined();
  });

  it('return the default value for an empty array with a default value', () => {
    expect(last([], 42)).toBe(42);
    expect(last([], 'default')).toBe('default');
  });

  it('return the first element even if a default value is provided', () => {
    expect(last([1, 2, 3], 42)).toBe(3);
    expect(last(['a', 'b', 'c'], 'default')).toBe('c');
  });
});