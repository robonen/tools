import { describe,it, expect } from 'vitest';
import { clamp } from '.';

describe('clamp', () => {
  it('should return the value itself if it is within the range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, -5, 5)).toBe(-3);
    expect(clamp(0, -10, 10)).toBe(0);
  });

  it('should return the minimum value if the value is less than the minimum', () => {
    expect(clamp(-10, 0, 10)).toBe(0);
    expect(clamp(-100, -50, 50)).toBe(-50);
    expect(clamp(-5, -5, 5)).toBe(-5);
  });

  it('should return the maximum value if the value is greater than the maximum', () => {
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(100, -50, 50)).toBe(50);
    expect(clamp(10, -5, 5)).toBe(5);
  });
});