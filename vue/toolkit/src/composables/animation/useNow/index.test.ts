import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import type { Ref } from 'vue';
import { useNow } from '.';
import type { UseNowControls } from '.';

describe(useNow, () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
  });
  afterEach(() => vi.useRealTimers());

  it('returns the current date', () => {
    const now = useNow({ interval: 100 });
    expect(now.value).toBeInstanceOf(Date);
    expect(now.value.getTime()).toBe(1000);
  });

  it('updates on the interval', () => {
    const now = useNow({ interval: 100 });

    // advanceTimersByTime also advances the mocked clock, so the tick fires at 1100
    vi.advanceTimersByTime(100);
    expect(now.value.getTime()).toBe(1100);

    vi.advanceTimersByTime(100);
    expect(now.value.getTime()).toBe(1200);
  });

  it('exposes controls when controls: true', () => {
    const { now, pause } = useNow({ controls: true, interval: 100 });

    expect(now.value).toBeInstanceOf(Date);

    vi.advanceTimersByTime(100);
    expect(now.value.getTime()).toBe(1100);

    pause();
    vi.advanceTimersByTime(100);
    expect(now.value.getTime()).toBe(1100);
  });

  it('exposes isActive and reflects pause/resume/toggle', () => {
    const { isActive, pause, resume, toggle } = useNow({ controls: true, interval: 100 });

    expect(isActive.value).toBeTruthy();

    pause();
    expect(isActive.value).toBeFalsy();

    resume();
    expect(isActive.value).toBeTruthy();

    toggle();
    expect(isActive.value).toBeFalsy();
  });

  it('does not start updating when immediate is false', () => {
    const { now, isActive } = useNow({ controls: true, interval: 100, immediate: false });

    expect(isActive.value).toBeFalsy();

    vi.advanceTimersByTime(100);
    expect(now.value.getTime()).toBe(1000);
  });

  it('invokes the callback on every update with the current date', () => {
    const callback = vi.fn();
    useNow({ interval: 100, callback });

    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.lastCall?.[0]).toBeInstanceOf(Date);
    expect((callback.mock.lastCall?.[0] as Date).getTime()).toBe(1100);

    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(2);
    expect((callback.mock.lastCall?.[0] as Date).getTime()).toBe(1200);
  });

  it('produces a fresh Date instance on each update', () => {
    const now = useNow({ interval: 100 });
    const first = now.value;

    vi.advanceTimersByTime(100);
    expect(now.value).not.toBe(first);
    expect(now.value.getTime()).toBe(1100);
  });

  it('defaults to the requestAnimationFrame strategy', () => {
    const raf = vi.fn().mockReturnValue(1);
    const caf = vi.fn();
    vi.stubGlobal('requestAnimationFrame', raf);
    vi.stubGlobal('cancelAnimationFrame', caf);

    try {
      const scope = effectScope();
      let result: UseNowControls | undefined;

      scope.run(() => {
        result = useNow({ controls: true });
      });

      // RAF strategy starts the loop immediately
      expect(result?.isActive.value).toBeTruthy();
      expect(raf).toHaveBeenCalled();

      scope.stop();
    }
    finally {
      vi.unstubAllGlobals();
    }
  });

  it('cleans up the updater when the scope is disposed', () => {
    const scope = effectScope();
    let now: Ref<Date> | undefined;

    scope.run(() => {
      now = useNow({ interval: 100 });
    });

    vi.advanceTimersByTime(100);
    expect(now?.value.getTime()).toBe(1100);

    scope.stop();

    vi.advanceTimersByTime(100);
    expect(now?.value.getTime()).toBe(1100);
  });

  it('does not update when interval mode runs without a callback firing (SSR-safe construction)', () => {
    // useNow must construct without throwing even before any tick; the initial
    // value is always a valid Date regardless of environment.
    const now = useNow({ interval: 100, immediate: false });
    expect(now.value).toBeInstanceOf(Date);
    expect(now.value.getTime()).toBe(1000);
  });
});
