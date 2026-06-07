import { describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, reactive, ref } from 'vue';
import { watchOnce } from '.';

describe(watchOnce, () => {
  it('does not fire before the source changes', () => {
    const count = ref(0);
    const cb = vi.fn();

    watchOnce(count, cb, { flush: 'sync' });

    expect(cb).not.toHaveBeenCalled();
  });

  it('fires once on the first change', () => {
    const count = ref(0);
    const cb = vi.fn();

    watchOnce(count, cb, { flush: 'sync' });

    count.value = 1;
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith(1, 0, expect.any(Function));
  });

  it('auto-stops after the first trigger', () => {
    const count = ref(0);
    const cb = vi.fn();

    watchOnce(count, cb, { flush: 'sync' });

    count.value = 1;
    count.value = 2;
    count.value = 3;

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith(1, 0, expect.any(Function));
  });

  it('works with a getter source', () => {
    const count = ref(0);
    const cb = vi.fn();

    watchOnce(() => count.value * 2, cb, { flush: 'sync' });

    count.value = 5;
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith(10, 0, expect.any(Function));

    count.value = 6;
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('works with an array of sources', () => {
    const a = ref(0);
    const b = ref('x');
    const cb = vi.fn();

    watchOnce([a, b], cb, { flush: 'sync' });

    a.value = 1;
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith([1, 'x'], [0, 'x'], expect.any(Function));

    b.value = 'y';
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('works with a reactive object source and deep option', () => {
    const state = reactive({ nested: { value: 0 } });
    const cb = vi.fn();

    watchOnce(state, cb, { deep: true, flush: 'sync' });

    state.nested.value = 1;
    expect(cb).toHaveBeenCalledTimes(1);

    state.nested.value = 2;
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('fires immediately with the immediate option and then stops', () => {
    const count = ref(0);
    const cb = vi.fn();

    watchOnce(count, cb, { immediate: true, flush: 'sync' });

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith(0, undefined, expect.any(Function));

    count.value = 1;
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('respects a custom flush timing', async () => {
    const count = ref(0);
    const cb = vi.fn();

    watchOnce(count, cb, { flush: 'post' });

    count.value = 1;
    expect(cb).not.toHaveBeenCalled();

    await nextTick();
    expect(cb).toHaveBeenCalledTimes(1);

    count.value = 2;
    await nextTick();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('returns a handle that stops watching before the first trigger', () => {
    const count = ref(0);
    const cb = vi.fn();

    const stop = watchOnce(count, cb, { flush: 'sync' });

    stop();

    count.value = 1;
    expect(cb).not.toHaveBeenCalled();
  });

  it('stops watching when the owning scope is disposed', () => {
    const count = ref(0);
    const cb = vi.fn();
    const scope = effectScope();

    scope.run(() => watchOnce(count, cb, { flush: 'sync' }));

    scope.stop();

    count.value = 1;
    expect(cb).not.toHaveBeenCalled();
  });

  it('passes an onCleanup function to the callback', () => {
    const count = ref(0);
    const cb = vi.fn();

    watchOnce(count, cb, { flush: 'sync' });

    count.value = 1;
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0]![2]).toBeTypeOf('function');
  });
});
