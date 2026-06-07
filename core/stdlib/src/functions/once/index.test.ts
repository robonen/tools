import { describe, expect, it, vi } from 'vitest';
import { once } from '.';

describe('once', () => {
  it('invoke the original function only once', () => {
    const spy = vi.fn(() => 42);
    const onced = once(spy);

    expect(onced()).toBe(42);
    expect(onced()).toBe(42);
    expect(onced()).toBe(42);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('forward arguments and this from the first call', () => {
    const onced = once(function (this: { base: number }, a: number, b: number) {
      return this.base + a + b;
    });

    expect(onced.call({ base: 10 }, 1, 2)).toBe(13);
  });

  it('cache the first result even when later args differ', () => {
    const onced = once((n: number) => n * 2);

    expect(onced(2)).toBe(4);
    expect(onced(100)).toBe(4);
  });

  it('run again after clear()', () => {
    let count = 0;
    const onced = once(() => ++count);

    expect(onced()).toBe(1);
    expect(onced()).toBe(1);

    onced.clear();

    expect(onced()).toBe(2);
  });

  it('stay retryable when the first call throws (guard armed only on success)', () => {
    let n = 0;
    const onced = once(() => {
      n++;
      if (n === 1)
        throw new Error('first');
      return n;
    });

    expect(() => onced()).toThrow('first');
    expect(onced()).toBe(2);
    expect(onced()).toBe(2);
  });
});
