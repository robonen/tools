import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, reactive, ref } from 'vue';
import { debouncedWatch, watchDebounced } from '.';

describe(watchDebounced, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not fire before the source changes', () => {
    const count = ref(0);
    const cb = vi.fn();

    watchDebounced(count, cb, { debounce: 100, flush: 'sync' });

    vi.advanceTimersByTime(200);
    expect(cb).not.toHaveBeenCalled();
  });

  it('defers the callback by the debounce delay', () => {
    const count = ref(0);
    const cb = vi.fn();

    watchDebounced(count, cb, { debounce: 100, flush: 'sync' });

    count.value = 1;
    expect(cb).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(cb).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith(1, 0, expect.any(Function));
  });

  it('coalesces rapid changes into a single trailing call', () => {
    const count = ref(0);
    const cb = vi.fn();

    watchDebounced(count, cb, { debounce: 100, flush: 'sync' });

    count.value = 1;
    vi.advanceTimersByTime(80);
    count.value = 2;
    vi.advanceTimersByTime(80);
    count.value = 3;

    expect(cb).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(cb).toHaveBeenCalledTimes(1);
    // The filtered callback receives the args of the latest watch trigger:
    // new value 3, and old value 2 (the source value just before the last change).
    expect(cb).toHaveBeenLastCalledWith(3, 2, expect.any(Function));
  });

  it('fires synchronously with no debounce (debounce = 0)', () => {
    const count = ref(0);
    const cb = vi.fn();

    watchDebounced(count, cb, { flush: 'sync' });

    count.value = 1;
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith(1, 0, expect.any(Function));
  });

  it('enforces maxWait under sustained changes', () => {
    const count = ref(0);
    const cb = vi.fn();

    watchDebounced(count, cb, { debounce: 100, maxWait: 250, flush: 'sync' });

    // Keep changing before the debounce timer can ever settle.
    count.value = 1;
    vi.advanceTimersByTime(80);
    count.value = 2;
    vi.advanceTimersByTime(80);
    count.value = 3;
    vi.advanceTimersByTime(80);
    // 240ms elapsed, debounce has reset each time, but maxWait is 250ms.
    expect(cb).not.toHaveBeenCalled();

    count.value = 4;
    vi.advanceTimersByTime(20);
    // maxWait (250ms) elapsed -> forced invocation with the latest trigger args.
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith(4, 3, expect.any(Function));
  });

  it('does not double-fire when maxWait and debounce settle together', () => {
    const count = ref(0);
    const cb = vi.fn();

    watchDebounced(count, cb, { debounce: 100, maxWait: 200, flush: 'sync' });

    count.value = 1;
    // debounce settles at 100ms; maxWait would be at 200ms but is cleared.
    vi.advanceTimersByTime(100);
    expect(cb).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(200);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('supports a reactive debounce delay', () => {
    const count = ref(0);
    const delay = ref(100);
    const cb = vi.fn();

    watchDebounced(count, cb, { debounce: delay, flush: 'sync' });

    count.value = 1;
    vi.advanceTimersByTime(100);
    expect(cb).toHaveBeenCalledTimes(1);

    delay.value = 300;
    count.value = 2;
    vi.advanceTimersByTime(100);
    expect(cb).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(200);
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('works with a getter source', () => {
    const count = ref(0);
    const cb = vi.fn();

    watchDebounced(() => count.value * 2, cb, { debounce: 100, flush: 'sync' });

    count.value = 5;
    vi.advanceTimersByTime(100);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith(10, 0, expect.any(Function));
  });

  it('works with an array of sources', () => {
    const a = ref(0);
    const b = ref('x');
    const cb = vi.fn();

    watchDebounced([a, b], cb, { debounce: 100, flush: 'sync' });

    a.value = 1;
    vi.advanceTimersByTime(100);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith([1, 'x'], [0, 'x'], expect.any(Function));
  });

  it('works with a reactive object source and deep option', () => {
    const state = reactive({ nested: { value: 0 } });
    const cb = vi.fn();

    watchDebounced(state, cb, { debounce: 100, deep: true, flush: 'sync' });

    state.nested.value = 1;
    vi.advanceTimersByTime(100);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('fires immediately with the immediate option', () => {
    const count = ref(0);
    const cb = vi.fn();

    watchDebounced(count, cb, { debounce: 100, immediate: true, flush: 'sync' });

    // immediate runs through the filter synchronously only when debounce=0;
    // with a positive debounce the immediate run is also debounced.
    vi.advanceTimersByTime(100);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith(0, undefined, expect.any(Function));
  });

  it('respects a custom flush timing', async () => {
    const count = ref(0);
    const cb = vi.fn();

    watchDebounced(count, cb, { debounce: 100, flush: 'post' });

    count.value = 1;
    await nextTick();
    expect(cb).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('returns a handle that stops watching', () => {
    const count = ref(0);
    const cb = vi.fn();

    const stop = watchDebounced(count, cb, { debounce: 100, flush: 'sync' });

    stop();

    count.value = 1;
    vi.advanceTimersByTime(200);
    expect(cb).not.toHaveBeenCalled();
  });

  it('stops watching when the owning scope is disposed', () => {
    const count = ref(0);
    const cb = vi.fn();
    const scope = effectScope();

    scope.run(() => watchDebounced(count, cb, { debounce: 100, flush: 'sync' }));

    scope.stop();

    count.value = 1;
    vi.advanceTimersByTime(200);
    expect(cb).not.toHaveBeenCalled();
  });

  it('honours a caller-supplied eventFilter over debounce/maxWait', () => {
    const count = ref(0);
    const cb = vi.fn();
    const passthrough = vi.fn((invoke: () => void) => invoke());

    watchDebounced(count, cb, {
      debounce: 1000,
      eventFilter: passthrough,
      flush: 'sync',
    });

    count.value = 1;
    // The custom filter invokes immediately, bypassing the debounce timer.
    expect(passthrough).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith(1, 0, expect.any(Function));
  });

  it('passes onCleanup to the callback', () => {
    const count = ref(0);
    const cleanup = vi.fn();

    watchDebounced(count, (_value, _old, onCleanup) => {
      onCleanup(cleanup);
    }, { debounce: 100, flush: 'sync' });

    count.value = 1;
    vi.advanceTimersByTime(100);
    count.value = 2;
    vi.advanceTimersByTime(100);

    // cleanup registered on the first settled run fires before the second.
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('exposes debouncedWatch as an alias', () => {
    expect(debouncedWatch).toBe(watchDebounced);
  });

  it('runs in a non-DOM scope without touching globals (SSR-safe)', () => {
    const count = ref(0);
    const cb = vi.fn();
    const scope = effectScope();

    expect(() => {
      scope.run(() => watchDebounced(count, cb, { debounce: 100, flush: 'sync' }));
    }).not.toThrow();

    scope.stop();
  });
});
