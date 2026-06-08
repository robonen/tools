import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, ref } from 'vue';
import { useTimeoutFn } from '.';

describe(useTimeoutFn, () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('calls the callback after the interval', () => {
    const cb = vi.fn();
    const { isPending } = useTimeoutFn(cb, 100);

    expect(isPending.value).toBeTruthy();
    expect(cb).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(cb).toHaveBeenCalledOnce();
    expect(isPending.value).toBeFalsy();
  });

  it('does not start when immediate is false', () => {
    const cb = vi.fn();
    const { isPending } = useTimeoutFn(cb, 100, { immediate: false });

    expect(isPending.value).toBeFalsy();
    vi.advanceTimersByTime(100);
    expect(cb).not.toHaveBeenCalled();
  });

  it('start forwards arguments to the callback', () => {
    const cb = vi.fn();
    const { start } = useTimeoutFn(cb, 100, { immediate: false });

    start('x', 1);
    vi.advanceTimersByTime(100);
    expect(cb).toHaveBeenCalledWith('x', 1);
  });

  it('restarting before the timeout fires only invokes the callback once with the latest args', () => {
    const cb = vi.fn();
    const { start } = useTimeoutFn(cb, 100, { immediate: false });

    start('first');
    vi.advanceTimersByTime(50);
    start('second');
    vi.advanceTimersByTime(50);
    expect(cb).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(cb).toHaveBeenCalledOnce();
    expect(cb).toHaveBeenCalledWith('second');
  });

  it('reads the interval reactively each time start runs', () => {
    const cb = vi.fn();
    const delay = ref(100);
    const { start } = useTimeoutFn(cb, delay, { immediate: false });

    start();
    vi.advanceTimersByTime(100);
    expect(cb).toHaveBeenCalledOnce();

    delay.value = 500;
    start();
    vi.advanceTimersByTime(100);
    expect(cb).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(400);
    expect(cb).toHaveBeenCalledTimes(2);
  });

  describe('immediateCallback', () => {
    it('invokes the callback synchronously on start and again after the delay', () => {
      const cb = vi.fn();
      const { start } = useTimeoutFn(cb, 100, {
        immediate: false,
        immediateCallback: true,
      });

      start('a');
      expect(cb).toHaveBeenCalledOnce();
      expect(cb).toHaveBeenCalledWith('a');

      vi.advanceTimersByTime(100);
      expect(cb).toHaveBeenCalledTimes(2);
      expect(cb).toHaveBeenLastCalledWith('a');
    });

    it('fires synchronously during immediate auto-start', () => {
      const cb = vi.fn();
      useTimeoutFn(cb, 100, { immediateCallback: true });

      expect(cb).toHaveBeenCalledOnce();
      vi.advanceTimersByTime(100);
      expect(cb).toHaveBeenCalledTimes(2);
    });
  });

  it('stop cancels a pending timeout', () => {
    const cb = vi.fn();
    const { stop, isPending } = useTimeoutFn(cb, 100);

    stop();
    expect(isPending.value).toBeFalsy();
    vi.advanceTimersByTime(100);
    expect(cb).not.toHaveBeenCalled();
  });

  it('cleans up on scope dispose', () => {
    const cb = vi.fn();
    const scope = effectScope();
    scope.run(() => useTimeoutFn(cb, 100));

    scope.stop();
    vi.advanceTimersByTime(100);
    expect(cb).not.toHaveBeenCalled();
  });
});
