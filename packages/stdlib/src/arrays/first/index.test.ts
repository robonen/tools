import { describe, it, expect } from 'vitest';
import { first } from '.';

describe('first', () => {
  it('return the first element of a non-empty array', () => {
    expect(first([1, 2, 3])).toBe(1);
    expect(first(['a', 'b', 'c'])).toBe('a');
  });

  it('return undefined for an empty array without a default value', () => {
    expect(first([])).toBeUndefined();
  });

  it('return the default value for an empty array with a default value', () => {
    expect(first([], 42)).toBe(42);
    expect(first([], 'default')).toBe('default');
  });

  it('return the first element even if a default value is provided', () => {
    expect(first([1, 2, 3], 42)).toBe(1);
    expect(first(['a', 'b', 'c'], 'default')).toBe('a');
  });
});