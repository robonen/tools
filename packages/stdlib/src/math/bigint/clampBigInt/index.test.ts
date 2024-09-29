import {describe, it, expect} from 'vitest';
import {clampBigInt} from './index';

describe('clampBigInt', () => {
  it('clamp a value within the given range', () => {
    // value < min
    expect(clampBigInt(-10n, 0n, 100n)).toBe(0n);

    // value > max
    expect(clampBigInt(200n, 0n, 100n)).toBe(100n);

    // value within range
    expect(clampBigInt(50n, 0n, 100n)).toBe(50n);

    // value at min
    expect(clampBigInt(0n, 0n, 100n)).toBe(0n);

    // value at max
    expect(clampBigInt(100n, 0n, 100n)).toBe(100n);

    // value at midpoint
    expect(clampBigInt(50n, 100n, 100n)).toBe(100n);
  });

  it('handle edge cases', () => {
    // all values are the same
    expect(clampBigInt(5n, 5n, 5n)).toBe(5n);

    // min > max
    expect(clampBigInt(10n, 100n, 50n)).toBe(50n);

    // negative range and value
    expect(clampBigInt(-10n, -100n, -5n)).toBe(-10n);
  });
});