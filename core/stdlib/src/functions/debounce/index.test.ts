import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce } from '.';

describe('debounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('delay invocation until wait elapses since the last call', () => {
    const spy = vi.fn();
    const debounced = debounce(spy, 100);

    debounced();
    debounced();
    debounced();
    expect(spy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('reset the timer on every call', () => {
    const spy = vi.fn();
    const debounced = debounce(spy, 100);

    debounced();
    vi.advanceTimersByTime(60);
    debounced();
    vi.advanceTimersByTime(60);
    expect(spy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(40);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('invoke on the leading edge', () => {
    const spy = vi.fn();
    const debounced = debounce(spy, 100, { leading: true, trailing: false });

    debounced();
    expect(spy).toHaveBeenCalledTimes(1);

    debounced();
    debounced();
    expect(spy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('forward the latest arguments and this', () => {
    const spy = vi.fn(function (this: { base: number }, n: number) {
      return this.base + n;
    });
    const debounced = debounce(spy, 100);

    debounced.call({ base: 10 }, 1);
    debounced.call({ base: 10 }, 2);
    vi.advanceTimersByTime(100);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith(2);
    expect(spy.mock.results[0]!.value).toBe(12);
  });

  it('cancel a pending invocation', () => {
    const spy = vi.fn();
    const debounced = debounce(spy, 100);

    debounced();
    expect(debounced.pending()).toBe(true);

    debounced.cancel();
    expect(debounced.pending()).toBe(false);

    vi.advanceTimersByTime(100);
    expect(spy).not.toHaveBeenCalled();
  });

  it('flush a pending invocation immediately and return its result', () => {
    const spy = vi.fn((n: number) => n * 2);
    const debounced = debounce(spy, 100);

    debounced(5);
    expect(debounced.flush()).toBe(10);
    expect(spy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('resolves the wait from a getter on each call', () => {
    const spy = vi.fn();
    let wait = 100;
    const debounced = debounce(spy, () => wait);

    debounced();
    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(1);

    wait = 200;
    debounced();
    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(1); // not yet, window is now 200
    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('forces invocation after maxWait under sustained calls', () => {
    const spy = vi.fn();
    const debounced = debounce(spy, 100, { maxWait: 250 });

    // Keep resetting the 100ms timer every 80ms; without maxWait it would never fire.
    debounced();
    vi.advanceTimersByTime(80);
    debounced();
    vi.advanceTimersByTime(80);
    debounced();
    vi.advanceTimersByTime(80);
    expect(spy).not.toHaveBeenCalled();

    // 240ms elapsed; at 250ms the maxWait fires.
    vi.advanceTimersByTime(10);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('pending() is false after a maxWait-forced invocation', () => {
    const debounced = debounce(vi.fn(), 100, { maxWait: 150 });
    debounced();
    vi.advanceTimersByTime(150);
    expect(debounced.pending()).toBe(false);
  });

  it('leading + trailing fires on both edges for a burst but once for a lone call', () => {
    const spy = vi.fn();
    const debounced = debounce(spy, 100, { leading: true, trailing: true });

    debounced();
    expect(spy).toHaveBeenCalledTimes(1); // leading
    debounced();
    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(2); // trailing

    spy.mockClear();
    debounced(); // isolated call
    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(1); // leading only, no trailing double-fire
  });

  it('re-arm after a trailing fire', () => {
    const spy = vi.fn();
    const debounced = debounce(spy, 100);

    debounced();
    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(1);

    debounced();
    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('flush() and cancel() are no-ops when nothing is pending', () => {
    const spy = vi.fn();
    const debounced = debounce(spy, 100);

    expect(debounced.flush()).toBeUndefined();
    debounced.cancel();

    expect(spy).not.toHaveBeenCalled();
    expect(debounced.pending()).toBe(false);
  });

  it('pending() is false during the window when trailing is disabled', () => {
    const debounced = debounce(vi.fn(), 100, { leading: true, trailing: false });

    debounced();
    expect(debounced.pending()).toBe(false);
  });
});
