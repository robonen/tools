import { describe, expect, it } from 'vitest';
import { inverseLerpBigInt, lerpBigInt } from '.';

const MAX_SAFE_INTEGER = BigInt(Number.MAX_SAFE_INTEGER);

describe('lerpBigInt', () => {
  it('interpolates between two bigint values', () => {
    const result = lerpBigInt(0n, 10n, 0.5);
    expect(result).toBe(5n);
  });

  it('returns start value when t is 0', () => {
    const result = lerpBigInt(0n, 10n, 0);
    expect(result).toBe(0n);
  });

  it('returns end value when t is 1', () => {
    const result = lerpBigInt(0n, 10n, 1);
    expect(result).toBe(10n);
  });

  it('handles negative interpolation values', () => {
    const result = lerpBigInt(0n, 10n, -0.5);
    expect(result).toBe(-5n);
  });

  it('handles interpolation values greater than 1', () => {
    const result = lerpBigInt(0n, 10n, 1.5);
    expect(result).toBe(15n);
  });

  it('truncates the fractional part toward zero', () => {
    expect(lerpBigInt(0n, 10n, 0.29)).toBe(2n); // 2.9 -> 2
    expect(lerpBigInt(0n, -10n, 0.29)).toBe(-2n); // -2.9 -> -2 (toward zero, asymmetric)
  });

  it('stays exact for very large bigint ranges', () => {
    expect(lerpBigInt(0n, 10n ** 30n, 0.5)).toBe(5n * 10n ** 29n);
  });

  it('interpolates a reversed (start > end) range', () => {
    expect(lerpBigInt(10n, 0n, 0.5)).toBe(5n);
    expect(lerpBigInt(10n, 0n, 0.25)).toBe(8n); // 10 + (-10 * 0.25) = 7.5 -> 8? truncation
  });
});

describe('inverseLerpBigInt', () => {
  it('returns 0 when value is start', () => {
    const result = inverseLerpBigInt(0n, 10n, 0n);
    expect(result).toBe(0);
  });

  it('returns 1 when value is end', () => {
    const result = inverseLerpBigInt(0n, 10n, 10n);
    expect(result).toBe(1);
  });

  it('interpolates correctly between two bigint values', () => {
    const result = inverseLerpBigInt(0n, 10n, 5n);
    expect(result).toBe(0.5);
  });

  it('handles values less than start', () => {
    const result = inverseLerpBigInt(0n, 10n, -5n);
    expect(result).toBe(-0.5);
  });

  it('handles values greater than end', () => {
    const result = inverseLerpBigInt(0n, 10n, 15n);
    expect(result).toBe(1.5);
  });

  it('handles same start and end values', () => {
    const result = inverseLerpBigInt(10n, 10n, 10n);
    expect(result).toBe(0);
  });

  it('returns 1 at the maximum safe integer', () => {
    expect(inverseLerpBigInt(0n, MAX_SAFE_INTEGER, MAX_SAFE_INTEGER)).toBe(1);
  });

  it('returns 0 at the start of a max-safe-integer range', () => {
    expect(inverseLerpBigInt(0n, MAX_SAFE_INTEGER, 0n)).toBe(0);
  });

  it('returns the midpoint of a max-safe-integer range', () => {
    // 6-decimal SCALE quantizes the result, so allow ~1e-6 tolerance.
    expect(inverseLerpBigInt(0n, MAX_SAFE_INTEGER, MAX_SAFE_INTEGER / 2n)).toBeCloseTo(0.5, 5);
  });

  it('handles values far beyond 2^53', () => {
    expect(inverseLerpBigInt(0n, 2n ** 128n, 2n ** 127n)).toBe(0.5);
  });
});
