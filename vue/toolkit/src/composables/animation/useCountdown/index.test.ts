import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, isReadonly, ref } from 'vue';
import { useCountdown } from '.';

describe(useCountdown, () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('does not start until start/resume is called (immediate defaults to false)', () => {
    const { remaining } = useCountdown(5);

    expect(remaining.value).toBe(5);
    vi.advanceTimersByTime(3000);
    expect(remaining.value).toBe(5);
  });

  it('decrements remaining on each tick', () => {
    const { remaining, start } = useCountdown(5);

    start();
    expect(remaining.value).toBe(5);
    vi.advanceTimersByTime(1000);
    expect(remaining.value).toBe(4);
    vi.advanceTimersByTime(2000);
    expect(remaining.value).toBe(2);
  });

  it('starts immediately when immediate is true', () => {
    const { remaining } = useCountdown(3, { immediate: true });

    vi.advanceTimersByTime(1000);
    expect(remaining.value).toBe(2);
  });

  it('exposes a read-only remaining ref', () => {
    const { remaining } = useCountdown(5);
    expect(isReadonly(remaining)).toBeTruthy();
  });

  it('stops at zero and never goes negative', () => {
    const { remaining, start } = useCountdown(2);

    start();
    vi.advanceTimersByTime(5000);
    expect(remaining.value).toBe(0);
  });

  it('calls onComplete exactly once when reaching zero', () => {
    const onComplete = vi.fn();
    const { start } = useCountdown(2, { onComplete });

    start();
    vi.advanceTimersByTime(2000);
    expect(onComplete).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2000);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('calls onTick with the current remaining value', () => {
    const onTick = vi.fn();
    const { start } = useCountdown(3, { onTick });

    start();
    vi.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenLastCalledWith(2);
    vi.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenLastCalledWith(1);
  });

  it('pauses and resumes from where it left off', () => {
    const { remaining, start, pause, resume, isActive } = useCountdown(10);

    start();
    vi.advanceTimersByTime(2000);
    expect(remaining.value).toBe(8);

    pause();
    expect(isActive.value).toBeFalsy();
    vi.advanceTimersByTime(3000);
    expect(remaining.value).toBe(8);

    resume();
    expect(isActive.value).toBeTruthy();
    vi.advanceTimersByTime(2000);
    expect(remaining.value).toBe(6);
  });

  it('does not resume when remaining is already zero', () => {
    const { remaining, start, resume, isActive } = useCountdown(1);

    start();
    vi.advanceTimersByTime(1000);
    expect(remaining.value).toBe(0);
    expect(isActive.value).toBeFalsy();

    resume();
    expect(isActive.value).toBeFalsy();
  });

  it('stop pauses and resets remaining to the initial value', () => {
    const { remaining, start, stop, isActive } = useCountdown(5);

    start();
    vi.advanceTimersByTime(2000);
    expect(remaining.value).toBe(3);

    stop();
    expect(isActive.value).toBeFalsy();
    expect(remaining.value).toBe(5);
  });

  it('reset restores the initial value without changing the running state', () => {
    const { remaining, start, reset, isActive } = useCountdown(5);

    start();
    vi.advanceTimersByTime(2000);
    expect(remaining.value).toBe(3);

    reset();
    expect(remaining.value).toBe(5);
    expect(isActive.value).toBeTruthy();

    vi.advanceTimersByTime(1000);
    expect(remaining.value).toBe(4);
  });

  it('reset and start accept an explicit countdown override', () => {
    const { remaining, start, reset } = useCountdown(5);

    reset(8);
    expect(remaining.value).toBe(8);

    start(3);
    expect(remaining.value).toBe(3);
    vi.advanceTimersByTime(1000);
    expect(remaining.value).toBe(2);
  });

  it('honours a custom tick interval', () => {
    const { remaining, start } = useCountdown(5, { interval: 500 });

    start();
    vi.advanceTimersByTime(500);
    expect(remaining.value).toBe(4);
    vi.advanceTimersByTime(1000);
    expect(remaining.value).toBe(2);
  });

  it('resolves a reactive initial countdown', () => {
    const initial = ref(4);
    const { remaining, reset } = useCountdown(initial);

    expect(remaining.value).toBe(4);

    initial.value = 9;
    reset();
    expect(remaining.value).toBe(9);
  });

  it('toggle flips the active state', () => {
    const { start, toggle, isActive } = useCountdown(10);

    start();
    expect(isActive.value).toBeTruthy();
    toggle();
    expect(isActive.value).toBeFalsy();
    toggle();
    expect(isActive.value).toBeTruthy();
  });

  it('cleans up the interval when the scope is disposed', () => {
    const scope = effectScope();
    let api: ReturnType<typeof useCountdown> | undefined;

    scope.run(() => {
      api = useCountdown(10, { immediate: true });
    });

    vi.advanceTimersByTime(2000);
    expect(api!.remaining.value).toBe(8);

    scope.stop();
    vi.advanceTimersByTime(5000);
    expect(api!.remaining.value).toBe(8);
  });
});
