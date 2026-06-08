import { describe, expect, it } from 'vitest';
import { range } from '.';

describe('range', () => {
  it('generate 0..stop with a single argument', () => {
    expect(range(4)).toEqual([0, 1, 2, 3]);
  });

  it('generate start..stop', () => {
    expect(range(1, 5)).toEqual([1, 2, 3, 4]);
  });

  it('respect a positive step', () => {
    expect(range(0, 10, 2)).toEqual([0, 2, 4, 6, 8]);
  });

  it('support a negative step', () => {
    expect(range(5, 0, -1)).toEqual([5, 4, 3, 2, 1]);
  });

  it('return an empty array for an empty range', () => {
    expect(range(0)).toEqual([]);
    expect(range(5, 5)).toEqual([]);
    expect(range(0, 5, -1)).toEqual([]);
  });

  it('return an empty array for a zero step', () => {
    expect(range(0, 5, 0)).toEqual([]);
  });

  it('handle non-integer steps', () => {
    expect(range(0, 1, 0.25)).toEqual([0, 0.25, 0.5, 0.75]);
  });

  it('span zero with a negative start', () => {
    expect(range(-2, 3)).toEqual([-2, -1, 0, 1, 2]);
    expect(range(-3, 3, 2)).toEqual([-3, -1, 1]);
  });

  it('handle a non-integer step that is not exactly representable', () => {
    const result = range(0, 1, 0.1);

    expect(result).toHaveLength(10);
    expect(result[0]).toBe(0);
    expect(result.at(-1)).toBeCloseTo(0.9, 10);
  });
});
