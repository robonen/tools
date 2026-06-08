import { describe, expect, it } from 'vitest';
import { isEqual } from '.';

describe('isEqual', () => {
  it('compare primitives', () => {
    expect(isEqual(1, 1)).toBe(true);
    expect(isEqual('a', 'a')).toBe(true);
    expect(isEqual(1, 2)).toBe(false);
    expect(isEqual(1, '1')).toBe(false);
    expect(isEqual(null, null)).toBe(true);
    expect(isEqual(null, undefined)).toBe(false);
  });

  it('treat NaN as equal to NaN', () => {
    expect(isEqual(Number.NaN, Number.NaN)).toBe(true);
    expect(isEqual(Number.NaN, 1)).toBe(false);
  });

  it('compare arrays deeply', () => {
    expect(isEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(isEqual([1, [2, 3]], [1, [2, 3]])).toBe(true);
    expect(isEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(isEqual([1, { a: 2 }], [1, { a: 3 }])).toBe(false);
  });

  it('compare plain objects deeply', () => {
    expect(isEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } })).toBe(true);
    expect(isEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(isEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  it('compare dates and regexps', () => {
    expect(isEqual(new Date(0), new Date(0))).toBe(true);
    expect(isEqual(new Date(0), new Date(1))).toBe(false);
    expect(isEqual(/a/gi, /a/gi)).toBe(true);
    expect(isEqual(/a/g, /a/i)).toBe(false);
  });

  it('compare Map and Set', () => {
    expect(isEqual(new Map([['a', 1]]), new Map([['a', 1]]))).toBe(true);
    expect(isEqual(new Map([['a', 1]]), new Map([['a', 2]]))).toBe(false);
    expect(isEqual(new Set([1, 2]), new Set([1, 2]))).toBe(true);
    expect(isEqual(new Set([1, 2]), new Set([1, 3]))).toBe(false);
  });

  it('distinguish arrays from objects', () => {
    expect(isEqual([], {})).toBe(false);
  });

  it('handle circular references', () => {
    const a: any = { name: 'a' };
    a.self = a;
    const b: any = { name: 'a' };
    b.self = b;
    expect(isEqual(a, b)).toBe(true);
  });
});
