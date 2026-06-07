import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { throttle } from '.';

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
  });
  afterEach(() => vi.useRealTimers());

  it('invoke immediately on the leading edge', () => {
    const spy = vi.fn();
    const throttled = throttle(spy, 100);

    throttled();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('throttle rapid calls to leading + trailing', () => {
    const spy = vi.fn();
    const throttled = throttle(spy, 100);

    throttled();
    throttled();
    throttled();
    expect(spy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('skip the leading call when leading is false', () => {
    const spy = vi.fn();
    const throttled = throttle(spy, 100, { leading: false });

    throttled();
    expect(spy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('skip the trailing call when trailing is false', () => {
    const spy = vi.fn();
    const throttled = throttle(spy, 100, { trailing: false });

    throttled();
    throttled();
    throttled();
    expect(spy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('allow another leading call after the window passes', () => {
    const spy = vi.fn();
    const throttled = throttle(spy, 100, { trailing: false });

    throttled();
    expect(spy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(150);
    throttled();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('cancel a pending trailing call', () => {
    const spy = vi.fn();
    const throttled = throttle(spy, 100);

    throttled();
    throttled();
    expect(throttled.pending()).toBe(true);

    throttled.cancel();
    expect(throttled.pending()).toBe(false);

    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('flush a pending trailing call immediately and return its result', () => {
    const spy = vi.fn((n: number) => n * 2);
    const throttled = throttle(spy, 100);

    throttled(1);
    throttled(5);
    expect(throttled.flush()).toBe(10);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(throttled.pending()).toBe(false);
  });

  it('resolves the wait from a getter on each call', () => {
    const spy = vi.fn();
    let wait = 100;
    const throttled = throttle(spy, () => wait, { leading: false });

    throttled();
    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(1);

    wait = 200;
    throttled();
    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(1); // window widened to 200
    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('trailing invocation uses the latest arguments', () => {
    const spy = vi.fn();
    const throttled = throttle(spy, 100);

    throttled('a');
    throttled('b');
    throttled('c');
    vi.advanceTimersByTime(100);

    expect(spy).toHaveBeenNthCalledWith(1, 'a'); // leading
    expect(spy).toHaveBeenNthCalledWith(2, 'c'); // trailing = most recent
  });

  it('rate-limit across multiple sustained windows', () => {
    const spy = vi.fn();
    const throttled = throttle(spy, 100);

    for (let i = 0; i < 5; i++) {
      throttled();
      vi.advanceTimersByTime(50);
    }

    // 250ms of calls every 50ms with a 100ms window — far fewer than 5 invocations.
    expect(spy.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(spy.mock.calls.length).toBeLessThan(5);
  });

  it('flush() with nothing scheduled returns the last result without double-calling', () => {
    const spy = vi.fn((n: number) => n);
    const throttled = throttle(spy, 100);

    throttled(1); // leading fires immediately, nothing trailing pending

    expect(throttled.flush()).toBe(1);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('preserve this on the leading call', () => {
    const throttled = throttle(function (this: { base: number }, n: number) {
      this.base += n;
    }, 100);
    const ctx = { base: 10 };

    throttled.call(ctx, 5);

    expect(ctx.base).toBe(15);
  });
});
