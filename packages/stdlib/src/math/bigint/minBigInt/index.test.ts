import {describe, it, expect} from 'vitest';
import {minBigInt} from './index';

describe('minBigInt', () => {
  it('returns Infinity when no values are provided', () => {
    expect(() => minBigInt()).toThrow(new TypeError('minBigInt requires at least one argument'));
  });

  it('returns the smallest value from a list of positive bigints', () => {
    const result = minBigInt(10n, 20n, 5n, 15n);
    expect(result).toBe(5n);
  });

  it('returns the smallest value from a list of negative bigints', () => {
    const result = minBigInt(-10n, -20n, -5n, -15n);
    expect(result).toBe(-20n);
  });

  it('returns the smallest value from a list of mixed positive and negative bigints', () => {
    const result = minBigInt(10n, -20n, 5n, -15n);
    expect(result).toBe(-20n);
  });

  it('returns the value itself when only one bigint is provided', () => {
    const result = minBigInt(10n);
    expect(result).toBe(10n);
  });

  it('returns the smallest value when all values are the same', () => {
    const result = minBigInt(10n, 10n, 10n);
    expect(result).toBe(10n);
  });

  it('handles a large number of bigints', () => {
    const values = Array.from({length: 1000}, (_, i) => BigInt(i));
    const result = minBigInt(...values);
    expect(result).toBe(0n);
  });
});