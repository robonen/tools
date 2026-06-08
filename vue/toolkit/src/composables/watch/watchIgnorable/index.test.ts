import { describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { watchIgnorable } from '.';

describe(watchIgnorable, () => {
  it('fires the callback on normal updates (async flush)', async () => {
    const count = ref(0);
    const cb = vi.fn();
    watchIgnorable(count, cb);

    count.value = 1;
    await nextTick();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith(1, 0, expect.any(Function));
  });

  it('suppresses the callback inside ignoreUpdates (async flush)', async () => {
    const count = ref(0);
    const cb = vi.fn();
    const { ignoreUpdates } = watchIgnorable(count, cb);

    ignoreUpdates(() => {
      count.value = 1;
    });
    await nextTick();
    expect(cb).not.toHaveBeenCalled();

    count.value = 2;
    await nextTick();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith(2, 1, expect.any(Function));
  });

  it('commits when an ignored update is followed by a real change before flush (async)', async () => {
    const count = ref(0);
    const cb = vi.fn();
    const { ignoreUpdates } = watchIgnorable(count, cb);

    ignoreUpdates(() => {
      count.value = 1;
    });
    // A real (non-ignored) change after the ignored one: syncCounter > ignoreCounter
    count.value = 2;
    await nextTick();

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith(2, 0, expect.any(Function));
  });

  it('supports multiple chained ignored updates (async)', async () => {
    const count = ref(0);
    const cb = vi.fn();
    const { ignoreUpdates } = watchIgnorable(count, cb);

    ignoreUpdates(() => {
      count.value = 1;
      count.value = 2;
      count.value = 3;
    });
    await nextTick();
    expect(cb).not.toHaveBeenCalled();
  });

  it('fires the callback on normal updates (sync flush)', () => {
    const count = ref(0);
    const cb = vi.fn();
    watchIgnorable(count, cb, { flush: 'sync' });

    count.value = 1;
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith(1, 0, expect.any(Function));
  });

  it('suppresses the callback inside ignoreUpdates (sync flush)', () => {
    const count = ref(0);
    const cb = vi.fn();
    const { ignoreUpdates } = watchIgnorable(count, cb, { flush: 'sync' });

    ignoreUpdates(() => {
      count.value = 1;
      count.value = 2;
    });
    expect(cb).not.toHaveBeenCalled();

    count.value = 3;
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith(3, 2, expect.any(Function));
  });

  it('ignorePrevAsyncUpdates suppresses already-queued changes (async)', async () => {
    const count = ref(0);
    const cb = vi.fn();
    const { ignorePrevAsyncUpdates } = watchIgnorable(count, cb);

    count.value = 1;
    // Drop the pending change before the async callback flushes
    ignorePrevAsyncUpdates();
    await nextTick();
    expect(cb).not.toHaveBeenCalled();
  });

  it('ignorePrevAsyncUpdates only drops prior changes, not subsequent ones (async)', async () => {
    const count = ref(0);
    const cb = vi.fn();
    const { ignorePrevAsyncUpdates } = watchIgnorable(count, cb);

    count.value = 1;
    ignorePrevAsyncUpdates();
    count.value = 2;
    await nextTick();

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith(2, 0, expect.any(Function));
  });

  it('ignorePrevAsyncUpdates is a no-op for sync flush', () => {
    const count = ref(0);
    const cb = vi.fn();
    const { ignorePrevAsyncUpdates } = watchIgnorable(count, cb, { flush: 'sync' });

    count.value = 1;
    expect(cb).toHaveBeenCalledTimes(1);
    // Calling after a sync change does nothing
    ignorePrevAsyncUpdates();
    count.value = 2;
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('stop tears down the watcher (async flush)', async () => {
    const count = ref(0);
    const cb = vi.fn();
    const { stop } = watchIgnorable(count, cb);

    stop();
    count.value = 1;
    await nextTick();
    expect(cb).not.toHaveBeenCalled();
  });

  it('stop tears down the watcher (sync flush)', () => {
    const count = ref(0);
    const cb = vi.fn();
    const { stop } = watchIgnorable(count, cb, { flush: 'sync' });

    stop();
    count.value = 1;
    expect(cb).not.toHaveBeenCalled();
  });

  it('watches an array of sources', async () => {
    const a = ref(0);
    const b = ref('x');
    const cb = vi.fn();
    const { ignoreUpdates } = watchIgnorable([a, b], cb);

    a.value = 1;
    await nextTick();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith([1, 'x'], [0, 'x'], expect.any(Function));

    ignoreUpdates(() => {
      b.value = 'y';
    });
    await nextTick();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('respects an eventFilter', async () => {
    const count = ref(0);
    const cb = vi.fn();
    // A filter that drops every invocation
    watchIgnorable(count, cb, { eventFilter: () => {} });

    count.value = 1;
    await nextTick();
    expect(cb).not.toHaveBeenCalled();
  });

  it('supports the immediate option', () => {
    const count = ref(5);
    const cb = vi.fn();
    watchIgnorable(count, cb, { immediate: true, flush: 'sync' });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith(5, undefined, expect.any(Function));
  });

  it('stops with the owning effect scope', async () => {
    const count = ref(0);
    const cb = vi.fn();
    const scope = effectScope();

    scope.run(() => watchIgnorable(count, cb));

    count.value = 1;
    await nextTick();
    expect(cb).toHaveBeenCalledTimes(1);

    scope.stop();
    count.value = 2;
    await nextTick();
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
