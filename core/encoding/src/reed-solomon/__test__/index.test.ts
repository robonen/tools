import { describe, expect, it } from 'vitest';
import { computeDivisor, computeRemainder, multiply } from '..';

describe('multiply', () => {
  it('multiplies zero by anything to get zero', () => {
    expect(multiply(0, 0)).toBe(0);
    expect(multiply(0, 1)).toBe(0);
    expect(multiply(0, 255)).toBe(0);
    expect(multiply(1, 0)).toBe(0);
  });

  it('multiplies by one (identity)', () => {
    expect(multiply(1, 1)).toBe(1);
    expect(multiply(1, 42)).toBe(42);
    expect(multiply(42, 1)).toBe(42);
    expect(multiply(1, 255)).toBe(255);
  });

  it('is commutative', () => {
    expect(multiply(5, 7)).toBe(multiply(7, 5));
    expect(multiply(0x53, 0xCA)).toBe(multiply(0xCA, 0x53));
    expect(multiply(100, 200)).toBe(multiply(200, 100));
  });

  it('produces known GF(2^8) products', () => {
    expect(multiply(2, 2)).toBe(4);
    expect(multiply(2, 0x80)).toBe(0x1D);
  });

  it('throws on out of range inputs', () => {
    expect(() => multiply(256, 0)).toThrow(RangeError);
    expect(() => multiply(0, 256)).toThrow(RangeError);
    expect(() => multiply(1000, 1000)).toThrow(RangeError);
  });
});

describe('computeDivisor', () => {
  it('computes a degree-1 divisor', () => {
    expect(computeDivisor(1)).toEqual(Uint8Array.from([1]));
  });

  it('computes a degree-2 divisor', () => {
    const result = computeDivisor(2);
    expect(result).toHaveLength(2);
    expect(result).toEqual(Uint8Array.from([3, 2]));
  });

  it('has correct length for arbitrary degrees', () => {
    expect(computeDivisor(7)).toHaveLength(7);
    expect(computeDivisor(10)).toHaveLength(10);
    expect(computeDivisor(30)).toHaveLength(30);
  });

  it('returns Uint8Array', () => {
    expect(computeDivisor(5)).toBeInstanceOf(Uint8Array);
  });

  it('throws on degree out of range', () => {
    expect(() => computeDivisor(0)).toThrow(RangeError);
    expect(() => computeDivisor(256)).toThrow(RangeError);
    expect(() => computeDivisor(-1)).toThrow(RangeError);
  });
});

describe('computeRemainder', () => {
  it('returns zero remainder for empty data', () => {
    const divisor = computeDivisor(4);
    const result = computeRemainder([], divisor);
    expect(result).toEqual(new Uint8Array(4));
  });

  it('produces non-zero remainder for non-empty data', () => {
    const divisor = computeDivisor(7);
    const data = [0x40, 0xD2, 0x75, 0x47, 0x76, 0x17, 0x32, 0x06, 0x27, 0x26, 0x96, 0xC6, 0xC6, 0x96, 0x70, 0xEC];
    const result = computeRemainder(data, divisor);
    expect(result).toHaveLength(7);
    expect(result).toBeInstanceOf(Uint8Array);
    for (const b of result) {
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(255);
    }
  });

  it('accepts Uint8Array as data input', () => {
    const divisor = computeDivisor(7);
    const data = Uint8Array.from([0x40, 0xD2, 0x75, 0x47]);
    const result = computeRemainder(data, divisor);
    expect(result).toHaveLength(7);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('remainder length matches divisor length', () => {
    for (const degree of [1, 5, 10, 20]) {
      const divisor = computeDivisor(degree);
      const data = [1, 2, 3, 4, 5];
      const result = computeRemainder(data, divisor);
      expect(result).toHaveLength(degree);
    }
  });

  it('produces correct ECC for QR Version 1-M reference data', () => {
    const data = [0x40, 0xD2, 0x75, 0x47, 0x76, 0x17, 0x32, 0x06, 0x27, 0x26, 0x96, 0xC6, 0xC6, 0x96, 0x70, 0xEC];
    const divisor = computeDivisor(10);
    const result = computeRemainder(data, divisor);
    expect(result).toEqual(Uint8Array.from([188, 42, 144, 19, 107, 175, 239, 253, 75, 224]));
  });

  it('is deterministic', () => {
    const data = [0x10, 0x20, 0x30, 0x40, 0x50];
    const divisor = computeDivisor(7);
    const a = computeRemainder(data, divisor);
    const b = computeRemainder(data, divisor);
    expect(a).toEqual(b);
  });
});
