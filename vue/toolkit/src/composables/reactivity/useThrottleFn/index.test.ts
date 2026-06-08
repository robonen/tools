import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useThrottleFn } from '.';

describe(useThrottleFn, () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('invokes immediately on the leading edge', () => {
    const fn = vi.fn();
    const throttled = useThrottleFn(fn, 100);

    throttled();
    expect(fn).toHaveBeenCalledOnce();
  });

  it('ignores calls within the window by default (no trailing)', () => {
    const fn = vi.fn();
    const throttled = useThrottleFn(fn, 100);

    throttled();
    throttled();
    throttled();
    vi.advanceTimersByTime(200);

    expect(fn).toHaveBeenCalledOnce();
  });

  it('invokes trailing when enabled', () => {
    const fn = vi.fn();
    const throttled = useThrottleFn(fn, 100, true);

    throttled('a');
    throttled('b');
    expect(fn).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('b');
  });

  it('resolves the promise with the function result', async () => {
    const throttled = useThrottleFn((x: number) => x + 1, 100);
    await expect(throttled(1)).resolves.toBe(2);
  });

  it('skips the leading edge when leading is false', () => {
    const fn = vi.fn();
    const throttled = useThrottleFn(fn, 100, true, false);

    // first call only opens the window (no leading edge)
    throttled('a');
    expect(fn).not.toHaveBeenCalled();

    // a call inside the same window schedules the trailing edge
    throttled('b');
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenLastCalledWith('b');
  });

  describe('options object', () => {
    it('accepts delay/trailing/leading via an options object', () => {
      const fn = vi.fn();
      const throttled = useThrottleFn(fn, { delay: 100, trailing: true });

      throttled('a');
      throttled('b');
      expect(fn).toHaveBeenCalledOnce();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith('b');
    });

    it('defaults delay to 200 when omitted', () => {
      const fn = vi.fn();
      const throttled = useThrottleFn(fn, {});

      throttled(); // leading edge
      expect(fn).toHaveBeenCalledOnce();

      vi.advanceTimersByTime(199);
      throttled(); // still inside the 200ms window → dropped (trailing off)
      expect(fn).toHaveBeenCalledOnce();

      vi.advanceTimersByTime(1); // 200ms elapsed — window reached
      throttled(); // new window opens on the leading edge
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('reactive delay', () => {
    it('reads the current delay on each call', () => {
      const fn = vi.fn();
      const delay = ref(100);
      const throttled = useThrottleFn(fn, delay);

      throttled();
      expect(fn).toHaveBeenCalledOnce();

      vi.advanceTimersByTime(101);
      throttled();
      expect(fn).toHaveBeenCalledTimes(2);

      delay.value = 1000;
      vi.advanceTimersByTime(101);
      throttled();
      // window grew to 1000ms, so this call is throttled
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('zero delay', () => {
    it('invokes synchronously on every call when delay <= 0', () => {
      const fn = vi.fn();
      const throttled = useThrottleFn(fn, 0);

      throttled();
      throttled();
      throttled();
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('cancel', () => {
    it('drops a pending trailing invocation', () => {
      const fn = vi.fn();
      const throttled = useThrottleFn(fn, 100, true);

      throttled('a');
      throttled('b');
      expect(fn).toHaveBeenCalledOnce();

      throttled.cancel();
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledOnce();
    });

    it('resolves the pending promise with undefined by default', async () => {
      const throttled = useThrottleFn((x: number) => x, 100, true);

      throttled(1);
      const pending = throttled(2);
      throttled.cancel();

      await expect(pending).resolves.toBeUndefined();
    });
  });

  describe('rejectOnCancel', () => {
    it('rejects a superseded trailing promise', async () => {
      const throttled = useThrottleFn((x: number) => x, 100, true, true, true);

      throttled(1);
      const superseded = throttled(2);
      // next call within the window supersedes the previous trailing promise
      const latest = throttled(3);

      await expect(superseded).rejects.toThrow();
      vi.advanceTimersByTime(100);
      await expect(latest).resolves.toBe(3);
    });

    it('rejects on explicit cancel', async () => {
      const throttled = useThrottleFn((x: number) => x, 100, true, true, true);

      throttled(1);
      const pending = throttled(2);
      throttled.cancel();

      await expect(pending).rejects.toThrow();
    });
  });

  describe('flush', () => {
    it('invokes the pending trailing call immediately', async () => {
      const fn = vi.fn((x: number) => x);
      const throttled = useThrottleFn(fn, 100, true);

      throttled(1);
      const pending = throttled(2);
      expect(fn).toHaveBeenCalledOnce();

      throttled.flush();
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith(2);
      await expect(pending).resolves.toBe(2);
    });

    it('is a no-op when nothing is pending', () => {
      const fn = vi.fn();
      const throttled = useThrottleFn(fn, 100, true);

      expect(() => throttled.flush()).not.toThrow();
      expect(fn).not.toHaveBeenCalled();
    });
  });

  it('preserves the calling context (this)', () => {
    const obj = {
      value: 42,
      method: vi.fn(function (this: { value: number }) {
        return this.value;
      }),
    };
    const throttled = useThrottleFn(obj.method, 100);

    throttled.call(obj);
    expect(obj.method).toHaveReturnedWith(42);
  });
});
