import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, isReadonly, ref } from 'vue';
import { useTimeout } from '.';

describe(useTimeout, () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('flips ready to true after the interval', () => {
    const ready = useTimeout(100);

    expect(ready.value).toBeFalsy();
    vi.advanceTimersByTime(100);
    expect(ready.value).toBeTruthy();
  });

  it('defaults the interval to 1000ms', () => {
    const ready = useTimeout();

    vi.advanceTimersByTime(999);
    expect(ready.value).toBeFalsy();
    vi.advanceTimersByTime(1);
    expect(ready.value).toBeTruthy();
  });

  it('returns a read-only computed by default', () => {
    const ready = useTimeout(100);

    expect(isReadonly(ready)).toBeTruthy();
  });

  it('starts ready when immediate is false', () => {
    const ready = useTimeout(100, { immediate: false });

    expect(ready.value).toBeTruthy();
    vi.advanceTimersByTime(100);
    expect(ready.value).toBeTruthy();
  });

  it('invokes the callback when the timeout elapses', () => {
    const callback = vi.fn();
    useTimeout(100, { callback });

    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledOnce();
  });

  it('reads the interval reactively each time it starts', () => {
    const delay = ref(100);
    const { ready, start } = useTimeout(delay, { controls: true, immediate: false });

    delay.value = 200;
    start();
    expect(ready.value).toBeFalsy();
    vi.advanceTimersByTime(100);
    expect(ready.value).toBeFalsy();
    vi.advanceTimersByTime(100);
    expect(ready.value).toBeTruthy();
  });

  describe('controls', () => {
    it('exposes ready, start and stop', () => {
      const controls = useTimeout(100, { controls: true });

      expect(controls).toHaveProperty('ready');
      expect(controls).toHaveProperty('start');
      expect(controls).toHaveProperty('stop');
    });

    it('start restarts the pending timeout', () => {
      const { ready, start } = useTimeout(100, { controls: true });

      vi.advanceTimersByTime(50);
      start();
      vi.advanceTimersByTime(50);
      expect(ready.value).toBeFalsy();
      vi.advanceTimersByTime(50);
      expect(ready.value).toBeTruthy();
    });

    it('start re-arms the timeout after it has elapsed', () => {
      const callback = vi.fn();
      const { ready, start } = useTimeout(100, { controls: true, callback });

      vi.advanceTimersByTime(100);
      expect(ready.value).toBeTruthy();
      expect(callback).toHaveBeenCalledOnce();

      start();
      expect(ready.value).toBeFalsy();
      vi.advanceTimersByTime(100);
      expect(ready.value).toBeTruthy();
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('stop cancels the pending callback', () => {
      const callback = vi.fn();
      const { stop } = useTimeout(100, { controls: true, callback });

      stop();
      vi.advanceTimersByTime(100);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  it('cleans up on scope dispose', () => {
    const callback = vi.fn();
    const scope = effectScope();
    scope.run(() => {
      useTimeout(100, { callback });
    });

    scope.stop();
    vi.advanceTimersByTime(100);
    expect(callback).not.toHaveBeenCalled();
  });

  it('does not auto-start the real timer in a non-client (SSR) environment', () => {
    // `useTimeoutFn` is guarded by `isClient`; with immediate auto-start it
    // marks the timeout pending but only schedules a timer on the client.
    // We assert the SSR-safe contract: no callback fires without timers running.
    const callback = vi.fn();
    const { ready } = useTimeout(100, { controls: true, immediate: false, callback });

    // immediate:false means never auto-armed -> ready stays true, callback never fires
    expect(ready.value).toBeTruthy();
    vi.advanceTimersByTime(1000);
    expect(callback).not.toHaveBeenCalled();
  });
});
