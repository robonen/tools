import { describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, reactive, ref } from 'vue';
import { whenever } from '.';

describe(whenever, () => {
  it('does not fire while the source is falsy', () => {
    const ready = ref(false);
    const cb = vi.fn();

    whenever(ready, cb, { flush: 'sync' });

    expect(cb).not.toHaveBeenCalled();
  });

  it('fires when the source becomes truthy', () => {
    const ready = ref(false);
    const cb = vi.fn();

    whenever(ready, cb, { flush: 'sync' });

    ready.value = true;
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith(true, false, expect.any(Function));
  });

  it('does not fire when the source becomes falsy again', () => {
    const ready = ref(true);
    const cb = vi.fn();

    whenever(ready, cb, { flush: 'sync' });

    ready.value = false;
    expect(cb).not.toHaveBeenCalled();

    ready.value = true;
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('fires repeatedly on each truthy transition', () => {
    const value = ref(0);
    const cb = vi.fn();

    whenever(value, cb, { flush: 'sync' });

    value.value = 1;
    value.value = 0;
    value.value = 2;
    value.value = 0;
    value.value = 3;

    expect(cb).toHaveBeenCalledTimes(3);
  });

  it('works with a getter source', () => {
    const count = ref(0);
    const cb = vi.fn();

    whenever(() => count.value > 5, cb, { flush: 'sync' });

    count.value = 3;
    expect(cb).not.toHaveBeenCalled();

    count.value = 10;
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith(true, false, expect.any(Function));
  });

  it('fires immediately when source is already truthy with immediate', () => {
    const ready = ref(true);
    const cb = vi.fn();

    whenever(ready, cb, { immediate: true, flush: 'sync' });

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith(true, undefined, expect.any(Function));
  });

  it('does not fire immediately when source is falsy with immediate', () => {
    const ready = ref(false);
    const cb = vi.fn();

    whenever(ready, cb, { immediate: true, flush: 'sync' });

    expect(cb).not.toHaveBeenCalled();
  });

  it('only fires once with the once option', async () => {
    const value = ref(0);
    const cb = vi.fn();

    whenever(value, cb, { once: true, flush: 'sync' });

    value.value = 1;
    expect(cb).toHaveBeenCalledTimes(1);

    // once schedules teardown on the next tick
    await nextTick();

    value.value = 0;
    value.value = 2;
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('tracks deep mutations with the deep option', () => {
    const state = reactive({ active: false });
    const cb = vi.fn();

    whenever(() => state.active, cb, { deep: true, flush: 'sync' });

    state.active = true;
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('respects a custom flush timing', async () => {
    const ready = ref(false);
    const cb = vi.fn();

    whenever(ready, cb, { flush: 'post' });

    ready.value = true;
    // post flush is deferred until after the next tick
    expect(cb).not.toHaveBeenCalled();

    await nextTick();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('returns a handle that stops watching when called', () => {
    const ready = ref(false);
    const cb = vi.fn();

    const stop = whenever(ready, cb, { flush: 'sync' });

    stop();

    ready.value = true;
    expect(cb).not.toHaveBeenCalled();
  });

  it('stops watching when the owning scope is disposed', () => {
    const ready = ref(false);
    const cb = vi.fn();
    const scope = effectScope();

    scope.run(() => whenever(ready, cb, { flush: 'sync' }));

    ready.value = true;
    expect(cb).toHaveBeenCalledTimes(1);

    scope.stop();

    ready.value = false;
    ready.value = true;
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('passes the truthy value to the callback for non-boolean sources', () => {
    const user = ref<{ id: number } | null>(null);
    const cb = vi.fn();

    whenever(user, cb, { flush: 'sync' });

    const next = { id: 1 };
    user.value = next;
    expect(cb).toHaveBeenLastCalledWith(next, null, expect.any(Function));
  });
});
