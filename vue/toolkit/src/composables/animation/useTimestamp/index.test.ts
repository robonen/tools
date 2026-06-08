import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useTimestamp } from '.';

describe(useTimestamp, () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
  });
  afterEach(() => vi.useRealTimers());

  it('returns the current timestamp', () => {
    const ts = useTimestamp({ interval: 100 });
    expect(ts.value).toBe(1000);
  });

  it('applies the offset', () => {
    const ts = useTimestamp({ interval: 100, offset: 500 });
    expect(ts.value).toBe(1500);
  });

  it('updates on the interval', () => {
    const ts = useTimestamp({ interval: 100 });

    // advanceTimersByTime also advances the mocked clock, so the tick fires at 1100
    vi.advanceTimersByTime(100);
    expect(ts.value).toBe(1100);
  });

  it('exposes controls when controls: true', () => {
    const { timestamp, pause } = useTimestamp({ controls: true, interval: 100 });

    vi.advanceTimersByTime(100);
    expect(timestamp.value).toBe(1100);

    pause();
    vi.advanceTimersByTime(100);
    expect(timestamp.value).toBe(1100);
  });

  it('exposes isActive in the controls and reflects pause/resume', () => {
    const { isActive, pause, resume } = useTimestamp({ controls: true, interval: 100 });

    expect(isActive.value).toBeTruthy();

    pause();
    expect(isActive.value).toBeFalsy();

    resume();
    expect(isActive.value).toBeTruthy();
  });

  it('does not start updating when immediate is false', () => {
    const { timestamp, isActive } = useTimestamp({ controls: true, interval: 100, immediate: false });

    expect(isActive.value).toBeFalsy();

    vi.advanceTimersByTime(100);
    expect(timestamp.value).toBe(1000);
  });

  it('invokes the callback on every update with the current timestamp', () => {
    const callback = vi.fn();
    useTimestamp({ interval: 100, callback });

    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenLastCalledWith(1100);

    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith(1200);
  });

  it('supports a reactive offset that recomputes on the next update', () => {
    const offset = ref(0);
    const ts = useTimestamp({ interval: 100, offset });

    expect(ts.value).toBe(1000);

    offset.value = 500;
    vi.advanceTimersByTime(100);
    expect(ts.value).toBe(1600);
  });

  it('supports a getter offset', () => {
    let extra = 0;
    const ts = useTimestamp({ interval: 100, offset: () => extra });

    expect(ts.value).toBe(1000);

    extra = 250;
    vi.advanceTimersByTime(100);
    expect(ts.value).toBe(1350);
  });
});
