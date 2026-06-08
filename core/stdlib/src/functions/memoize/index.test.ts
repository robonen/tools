import { describe, expect, it, vi } from 'vitest';
import { memoize } from '.';

describe('memoize', () => {
  it('cache results by the first argument', () => {
    const spy = vi.fn((n: number) => n * 2);
    const memoized = memoize(spy);

    expect(memoized(2)).toBe(4);
    expect(memoized(2)).toBe(4);
    expect(memoized(3)).toBe(6);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('use a custom resolver for the cache key', () => {
    const spy = vi.fn((a: number, b: number) => a + b);
    const memoized = memoize(spy, (a, b) => `${a},${b}`);

    expect(memoized(1, 2)).toBe(3);
    expect(memoized(1, 2)).toBe(3);
    expect(memoized(2, 1)).toBe(3);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('cache falsy results', () => {
    const spy = vi.fn((_n: number) => 0);
    const memoized = memoize(spy);

    expect(memoized(1)).toBe(0);
    expect(memoized(1)).toBe(0);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('expose the cache and a clear() method', () => {
    const memoized = memoize((n: number) => n * 2);

    memoized(2);
    expect(memoized.cache.size).toBe(1);
    expect(memoized.cache.get(2)).toBe(4);

    memoized.clear();
    expect(memoized.cache.size).toBe(0);
  });

  it('preserve this', () => {
    const memoized = memoize(function (this: { base: number }, n: number) {
      return this.base + n;
    });

    expect(memoized.call({ base: 10 }, 5)).toBe(15);
  });

  it('key only on the first argument by default (documented multi-arg footgun)', () => {
    const spy = vi.fn((a: number, b: number) => a + b);
    const memoized = memoize(spy);

    expect(memoized(1, 2)).toBe(3);
    expect(memoized(1, 9)).toBe(3); // stale — collides on first arg
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('cache an undefined return value (does not recompute)', () => {
    const spy = vi.fn((_n: number) => undefined);
    const memoized = memoize(spy);

    memoized(1);
    memoized(1);

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
