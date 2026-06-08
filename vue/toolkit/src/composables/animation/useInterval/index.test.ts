import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isReadonly } from 'vue';
import { useInterval } from '.';

describe(useInterval, () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('increments the counter on every tick', () => {
    const counter = useInterval(100);

    expect(counter.value).toBe(0);
    vi.advanceTimersByTime(100);
    expect(counter.value).toBe(1);
    vi.advanceTimersByTime(200);
    expect(counter.value).toBe(3);
  });

  it('returns a read-only counter', () => {
    const counter = useInterval(100);
    expect(isReadonly(counter)).toBeTruthy();
  });

  it('does not tick when immediate is false', () => {
    const counter = useInterval(100, { immediate: false });
    vi.advanceTimersByTime(300);
    expect(counter.value).toBe(0);
  });

  it('exposes controls and reset when controls: true', () => {
    const { counter, pause, reset } = useInterval(100, { controls: true });

    vi.advanceTimersByTime(200);
    expect(counter.value).toBe(2);

    pause();
    vi.advanceTimersByTime(200);
    expect(counter.value).toBe(2);

    reset();
    expect(counter.value).toBe(0);
  });

  it('exposes a read-only counter in controls mode', () => {
    const { counter } = useInterval(100, { controls: true });
    expect(isReadonly(counter)).toBeTruthy();
  });

  it('exposes isActive reflecting the running state', () => {
    const { isActive, pause, resume } = useInterval(100, { controls: true });

    expect(isActive.value).toBeTruthy();

    pause();
    expect(isActive.value).toBeFalsy();

    resume();
    expect(isActive.value).toBeTruthy();
  });

  it('resumes after a pause and keeps counting from where it left off', () => {
    const { counter, pause, resume } = useInterval(100, { controls: true });

    vi.advanceTimersByTime(100);
    expect(counter.value).toBe(1);

    pause();
    vi.advanceTimersByTime(300);
    expect(counter.value).toBe(1);

    resume();
    vi.advanceTimersByTime(200);
    expect(counter.value).toBe(3);
  });

  it('toggle flips the active state', () => {
    const { isActive, toggle } = useInterval(100, { controls: true });

    expect(isActive.value).toBeTruthy();
    toggle();
    expect(isActive.value).toBeFalsy();
    toggle();
    expect(isActive.value).toBeTruthy();
  });

  it('invokes the callback with the incremented counter value', () => {
    const callback = vi.fn();
    useInterval(100, { callback });

    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledWith(1);
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenLastCalledWith(2);
  });

  it('reset keeps the interval running', () => {
    const { counter, reset } = useInterval(100, { controls: true });

    vi.advanceTimersByTime(200);
    expect(counter.value).toBe(2);

    reset();
    expect(counter.value).toBe(0);

    vi.advanceTimersByTime(100);
    expect(counter.value).toBe(1);
  });
});
