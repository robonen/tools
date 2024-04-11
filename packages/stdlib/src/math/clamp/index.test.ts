import { describe,it, expect } from 'vitest';
import { clamp } from '.';

describe('clamp', () => {
  it('clamp a value within the given range', () => {
    // value < min
    expect(clamp(-10, 0, 100)).toBe(0);

    // value > max
    expect(clamp(200, 0, 100)).toBe(100);

    // value within range
    expect(clamp(50, 0, 100)).toBe(50);

    // value at min
    expect(clamp(0, 0, 100)).toBe(0);

    // value at max
    expect(clamp(100, 0, 100)).toBe(100);

    // value at midpoint
    expect(clamp(50, 100, 100)).toBe(100);
  });

  it('handle floating-point numbers correctly', () => {
    // floating-point value within range
    expect(clamp(3.14, 0, 5)).toBe(3.14);

    // floating-point value < min
    expect(clamp(-1.5, 0, 10)).toBe(0);

    // floating-point value > max
    expect(clamp(15.75, 0, 10)).toBe(10);
  });

  it('handle edge cases', () => {
    // all values are the same
    expect(clamp(5, 5, 5)).toBe(5);

    // min > max
    expect(clamp(10, 100, 50)).toBe(50);

    // negative range and value
    expect(clamp(-10, -100, -5)).toBe(-10);
  });
});