import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, reactive, ref } from 'vue';
import { watchThrottled } from '.';

describe(watchThrottled, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('does not fire before the source changes', async () => {
    const count = ref(0);
    const cb = vi.fn();

    watchThrottled(count, cb, { throttle: 100 });

    await nextTick();
    expect(cb).not.toHaveBeenCalled();
  });

  it('fires immediately on the leading edge', async () => {
    const count = ref(0);
    const cb = vi.fn();

    watchThrottled(count, cb, { throttle: 100, flush: 'sync' });

    count.value = 1;
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith(1, 0, expect.any(Function));
  });

  it('throttles rapid changes to one leading + one trailing call', async () => {
    const count = ref(0);
    const cb = vi.fn();

    watchThrottled(count, cb, { throttle: 100, flush: 'sync' });

    count.value = 1; // leading -> fires with 1
    count.value = 2;
    count.value = 3; // scheduled trailing -> fires with latest (3)

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith(1, 0, expect.any(Function));

    await vi.advanceTimersByTimeAsync(100);

    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenLastCalledWith(3, 2, expect.any(Function));
  });

  it('suppresses the leading call when leading is false', async () => {
    const count = ref(0);
    const cb = vi.fn();

    watchThrottled(count, cb, { throttle: 100, leading: false, flush: 'sync' });

    count.value = 1;
    expect(cb).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(100);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith(1, 0, expect.any(Function));
  });

  it('suppresses the trailing call when trailing is false', async () => {
    const count = ref(0);
    const cb = vi.fn();

    watchThrottled(count, cb, { throttle: 100, trailing: false, flush: 'sync' });

    count.value = 1; // leading
    count.value = 2;
    count.value = 3;

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith(1, 0, expect.any(Function));

    await vi.advanceTimersByTimeAsync(200);

    // no trailing invocation
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('behaves like a plain watch when throttle is 0', async () => {
    const count = ref(0);
    const cb = vi.fn();

    watchThrottled(count, cb, { throttle: 0, flush: 'sync' });

    count.value = 1;
    count.value = 2;
    count.value = 3;

    expect(cb).toHaveBeenCalledTimes(3);
    expect(cb).toHaveBeenLastCalledWith(3, 2, expect.any(Function));
  });

  it('works with a getter source', async () => {
    const count = ref(0);
    const cb = vi.fn();

    watchThrottled(() => count.value * 2, cb, { throttle: 100, flush: 'sync' });

    count.value = 5;
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith(10, 0, expect.any(Function));
  });

  it('works with an array of sources', async () => {
    const a = ref(0);
    const b = ref('x');
    const cb = vi.fn();

    watchThrottled([a, b], cb, { throttle: 100, flush: 'sync' });

    a.value = 1;
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith([1, 'x'], [0, 'x'], expect.any(Function));
  });

  it('works with a reactive object source and deep option', async () => {
    const state = reactive({ nested: { value: 0 } });
    const cb = vi.fn();

    watchThrottled(state, cb, { throttle: 100, deep: true, flush: 'sync' });

    state.nested.value = 1;
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('honors a reactive throttle interval', async () => {
    const count = ref(0);
    const interval = ref(100);
    const cb = vi.fn();

    watchThrottled(count, cb, { throttle: interval, flush: 'sync' });

    count.value = 1; // leading at t=0
    count.value = 2; // schedules trailing at t=100
    expect(cb).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(100);
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('respects a post flush timing', async () => {
    const count = ref(0);
    const cb = vi.fn();

    watchThrottled(count, cb, { throttle: 100, flush: 'post' });

    count.value = 1;
    expect(cb).not.toHaveBeenCalled();

    await nextTick();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('fires immediately with the immediate option', async () => {
    const count = ref(5);
    const cb = vi.fn();

    watchThrottled(count, cb, { throttle: 100, immediate: true, flush: 'sync' });

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith(5, undefined, expect.any(Function));
  });

  it('returns a handle that stops watching', async () => {
    const count = ref(0);
    const cb = vi.fn();

    const stop = watchThrottled(count, cb, { throttle: 100, flush: 'sync' });

    stop();

    count.value = 1;
    await vi.advanceTimersByTimeAsync(100);
    expect(cb).not.toHaveBeenCalled();
  });

  it('stops watching when the owning scope is disposed', async () => {
    const count = ref(0);
    const cb = vi.fn();
    const scope = effectScope();

    scope.run(() => watchThrottled(count, cb, { throttle: 100, flush: 'sync' }));

    scope.stop();

    count.value = 1;
    await vi.advanceTimersByTimeAsync(100);
    expect(cb).not.toHaveBeenCalled();
  });

  it('passes onCleanup to the callback', async () => {
    const count = ref(0);
    const cleanup = vi.fn();

    watchThrottled(count, (_value, _old, onCleanup) => {
      onCleanup(cleanup);
    }, { throttle: 100, flush: 'sync' });

    count.value = 1;
    count.value = 2; // schedules trailing, which triggers cleanup of the leading run

    await vi.advanceTimersByTimeAsync(100);
    expect(cleanup).toHaveBeenCalled();
  });
});
