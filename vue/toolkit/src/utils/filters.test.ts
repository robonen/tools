import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref } from 'vue';
import { bypassFilter, debounceFilter, throttleFilter, pausableFilter } from './filters';

describe(bypassFilter, () => {
  it('invokes callback immediately', () => {
    const fn = vi.fn();
    bypassFilter(fn);
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe(debounceFilter, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('delays invocation by the specified ms', () => {
    const filter = debounceFilter(100);
    const fn = vi.fn();

    filter(fn);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('resets timer on repeated calls', () => {
    const filter = debounceFilter(100);
    const fn = vi.fn();

    filter(fn);
    vi.advanceTimersByTime(80);
    filter(fn);
    vi.advanceTimersByTime(80);

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(20);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('supports reactive ms via ref', () => {
    const delay = ref(100);
    const filter = debounceFilter(delay);
    const fn = vi.fn();

    filter(fn);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();

    delay.value = 200;
    filter(fn);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce(); // still 1

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe(throttleFilter, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('invokes immediately on first call (leading)', () => {
    const filter = throttleFilter(100);
    const fn = vi.fn();

    filter(fn);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('throttles subsequent calls', () => {
    const filter = throttleFilter(100);
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    filter(fn1);
    expect(fn1).toHaveBeenCalledOnce();

    // Within throttle window
    filter(fn2);
    expect(fn2).not.toHaveBeenCalled();

    // After throttle window, trailing fires
    vi.advanceTimersByTime(100);
    expect(fn2).toHaveBeenCalledOnce();
  });

  it('does not invoke trailing when trailing=false', () => {
    const filter = throttleFilter(100, false, true);
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    filter(fn1);
    expect(fn1).toHaveBeenCalledOnce();

    filter(fn2);
    vi.advanceTimersByTime(200);
    expect(fn2).not.toHaveBeenCalled();
  });

  it('does not invoke leading when leading=false', () => {
    const filter = throttleFilter(100, true, false);
    const fn = vi.fn();

    filter(fn);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe(pausableFilter, () => {
  it('invokes immediately when active', () => {
    const { filter, isActive } = pausableFilter();
    const fn = vi.fn();

    expect(isActive.value).toBeTruthy();
    filter(fn);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('queues invocations when paused', () => {
    const { filter, pause } = pausableFilter();
    const fn = vi.fn();

    pause();
    filter(fn);
    expect(fn).not.toHaveBeenCalled();
  });

  it('replays queued invocations on resume', () => {
    const { filter, pause, resume } = pausableFilter();
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    pause();
    filter(fn1);
    filter(fn2);
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).not.toHaveBeenCalled();

    resume();
    expect(fn1).toHaveBeenCalledOnce();
    expect(fn2).toHaveBeenCalledOnce();
  });

  it('isActive reflects the paused state', () => {
    const { isActive, pause, resume } = pausableFilter();

    expect(isActive.value).toBeTruthy();
    pause();
    expect(isActive.value).toBeFalsy();
    resume();
    expect(isActive.value).toBeTruthy();
  });
});
