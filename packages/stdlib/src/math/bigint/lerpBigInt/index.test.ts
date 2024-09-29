import {describe, it, expect} from 'vitest';
import {inverseLerpBigInt, lerpBigInt} from './index';

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

  it('handles the maximum safe integer correctly', () => {
    const result = inverseLerpBigInt(0n, MAX_SAFE_INTEGER, MAX_SAFE_INTEGER);
    expect(result).toBe(1);
  });

  it('handles values just above the maximum safe integer correctly', () => {
    const result = inverseLerpBigInt(0n, MAX_SAFE_INTEGER, 0n);
    expect(result).toBe(0);
  });

  it('handles values just below the maximum safe integer correctly', () => {
    const result = inverseLerpBigInt(0n, MAX_SAFE_INTEGER, MAX_SAFE_INTEGER);
    expect(result).toBe(1);
  });

  it('handles values just above the maximum safe integer correctly', () => {
    const result = inverseLerpBigInt(0n, 2n ** 128n, 2n ** 127n);
    expect(result).toBe(0.5);
  });
});
