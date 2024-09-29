import { describe, it, expect } from 'vitest';
import { maxBigInt } from './index';

describe('maxBigInt', () => {
  it('returns -Infinity when no values are provided', () => {
    expect(() => maxBigInt()).toThrow(new TypeError('maxBigInt requires at least one argument'));
  });

  it('returns the largest value from a list of positive bigints', () => {
    const result = maxBigInt(10n, 20n, 5n, 15n);
    expect(result).toBe(20n);
  });

  it('returns the largest value from a list of negative bigints', () => {
    const result = maxBigInt(-10n, -20n, -5n, -15n);
    expect(result).toBe(-5n);
  });

  it('returns the largest value from a list of mixed positive and negative bigints', () => {
    const result = maxBigInt(10n, -20n, 5n, -15n);
    expect(result).toBe(10n);
  });

  it('returns the value itself when only one bigint is provided', () => {
    const result = maxBigInt(10n);
    expect(result).toBe(10n);
  });

  it('returns the largest value when all values are the same', () => {
    const result = maxBigInt(10n, 10n, 10n);
    expect(result).toBe(10n);
  });

  it('handles a large number of bigints', () => {
    const values = Array.from({ length: 1000 }, (_, i) => BigInt(i));
    const result = maxBigInt(...values);
    expect(result).toBe(999n);
  });
});