import {describe, it, expect} from 'vitest';
import {inverseLerp, lerp} from '.';

describe('lerp', () => {
  it('interpolates between two values', () => {
    const result = lerp(0, 10, 0.5);
    expect(result).toBe(5);
  });

  it('returns start value when t is 0', () => {
    const result = lerp(0, 10, 0);
    expect(result).toBe(0);
  });

  it('returns end value when t is 1', () => {
    const result = lerp(0, 10, 1);
    expect(result).toBe(10);
  });

  it('handles negative interpolation values', () => {
    const result = lerp(0, 10, -0.5);
    expect(result).toBe(-5);
  });

  it('handles interpolation values greater than 1', () => {
    const result = lerp(0, 10, 1.5);
    expect(result).toBe(15);
  });
});

describe('inverseLerp', () => {
  it('returns 0 when value is start', () => {
    const result = inverseLerp(0, 10, 0);
    expect(result).toBe(0);
  });

  it('returns 1 when value is end', () => {
    const result = inverseLerp(0, 10, 10);
    expect(result).toBe(1);
  });

  it('interpolates correctly between two values', () => {
    const result = inverseLerp(0, 10, 5);
    expect(result).toBe(0.5);
  });

  it('handles values less than start', () => {
    const result = inverseLerp(0, 10, -5);
    expect(result).toBe(-0.5);
  });

  it('handles values greater than end', () => {
    const result = inverseLerp(0, 10, 15);
    expect(result).toBe(1.5);
  });

  it('handles same start and end values', () => {
    const result = inverseLerp(10, 10, 10);
    expect(result).toBe(0);
  });
});
