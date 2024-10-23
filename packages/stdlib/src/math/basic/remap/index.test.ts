import {describe, expect, it} from 'vitest';
import {remap} from '.';

describe('remap', () => {
  it('map values from one range to another', () => {
    // value at midpoint
    expect(remap(5, 0, 10, 0, 100)).toBe(50);

    // value at min
    expect(remap(0, 0, 10, 0, 100)).toBe(0);

    // value at max
    expect(remap(10, 0, 10, 0, 100)).toBe(100);

    // value outside range (below)
    expect(remap(-5, 0, 10, 0, 100)).toBe(0);

    // value outside range (above)
    expect(remap(15, 0, 10, 0, 100)).toBe(100);

    // value at midpoint of negative range
    expect(remap(75, 50, 100, -50, 50)).toBe(0);

    // value at midpoint of negative range
    expect(remap(-25, -50, 0, 0, 100)).toBe(50);
  });

  it('handle floating-point numbers correctly', () => {
    // floating-point value
    expect(remap(3.5, 0, 10, 0, 100)).toBe(35);

    // positive floating-point ranges
    expect(remap(1.25, 0, 2.5, 0, 100)).toBe(50);

    // negative floating-point value
    expect(remap(-2.5, -5, 0, 0, 100)).toBe(50);

    // negative floating-point ranges
    expect(remap(-1.25, -2.5, 0, 0, 100)).toBe(50);
  });

  it('handle edge cases', () => {
    // input range is zero (should return output min)
    expect(remap(5, 0, 0, 0, 100)).toBe(0);
  });
});