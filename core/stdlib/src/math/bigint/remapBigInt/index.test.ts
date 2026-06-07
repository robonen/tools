import { describe, expect, it } from 'vitest';
import { remapBigInt } from '.';

describe('remapBigInt', () => {
  it('map values from one range to another', () => {
    // value at midpoint
    expect(remapBigInt(5n, 0n, 10n, 0n, 100n)).toBe(50n);

    // value at min
    expect(remapBigInt(0n, 0n, 10n, 0n, 100n)).toBe(0n);

    // value at max
    expect(remapBigInt(10n, 0n, 10n, 0n, 100n)).toBe(100n);

    // value outside range (below)
    expect(remapBigInt(-5n, 0n, 10n, 0n, 100n)).toBe(0n);

    // value outside range (above)
    expect(remapBigInt(15n, 0n, 10n, 0n, 100n)).toBe(100n);

    // value at midpoint of negative range
    expect(remapBigInt(75n, 50n, 100n, -50n, 50n)).toBe(0n);

    // value at midpoint of negative range
    expect(remapBigInt(-25n, -50n, 0n, 0n, 100n)).toBe(50n);
  });

  it('handle edge cases', () => {
    // input range is zero (should return output min)
    expect(remapBigInt(5n, 0n, 0n, 0n, 100n)).toBe(0n);
  });

  it('stay exact for large ranges (no number round-trip)', () => {
    // 1/3 of 10^30, computed entirely in BigInt — only truncation, no float precision loss
    expect(remapBigInt(1n, 0n, 3n, 0n, 10n ** 30n)).toBe(333333333333333333333333333333n);
  });

  it('preserve precision well beyond 2^53', () => {
    const huge = 10n ** 40n;
    expect(remapBigInt(1n, 0n, 2n, 0n, huge)).toBe(huge / 2n);
  });
});
