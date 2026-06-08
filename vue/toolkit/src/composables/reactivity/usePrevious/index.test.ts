import { describe, expect, it, vi } from 'vitest';
import { effectScope, isReadonly, nextTick, reactive, ref } from 'vue';
import { usePrevious } from '.';

describe(usePrevious, () => {
  it('is undefined before any change', () => {
    const count = ref(0);
    const prev = usePrevious(count);
    expect(prev.value).toBeUndefined();
  });

  it('uses the provided initial value', () => {
    const count = ref(0);
    const prev = usePrevious(count, -1);
    expect(prev.value).toBe(-1);
  });

  it('tracks the previous value on change', () => {
    const count = ref(0);
    const prev = usePrevious(count);

    count.value = 1;
    expect(prev.value).toBe(0);

    count.value = 5;
    expect(prev.value).toBe(1);
  });

  it('works with a getter source', () => {
    const obj = ref({ n: 1 });
    const prev = usePrevious(() => obj.value.n);
    obj.value = { n: 2 };
    expect(prev.value).toBe(1);
  });

  it('returns a readonly ref', () => {
    const count = ref(0);
    const prev = usePrevious(count);
    expect(isReadonly(prev)).toBeTruthy();
  });

  it('does not throw when writing to the readonly ref (warns instead)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const count = ref(0);
    const prev = usePrevious(count);
    // @ts-expect-error: readonly ref must not be writable at the type level
    prev.value = 99;
    expect(prev.value).toBeUndefined();
    warn.mockRestore();
  });

  it('updates synchronously by default', () => {
    const count = ref(0);
    const prev = usePrevious(count);
    count.value = 1;
    // no flush/tick needed with the default sync flush
    expect(prev.value).toBe(0);
  });

  it('respects a custom flush timing', async () => {
    const count = ref(0);
    const prev = usePrevious(count, undefined, { flush: 'post' });

    count.value = 1;
    // post flush is deferred until after the next tick
    expect(prev.value).toBeUndefined();

    await nextTick();
    expect(prev.value).toBe(0);
  });

  it('tracks deep mutations with the deep option', () => {
    const state = reactive({ n: 1 });
    const prev = usePrevious(() => ({ ...state }), undefined, { deep: true });

    state.n = 2;
    expect(prev.value).toEqual({ n: 1 });

    state.n = 3;
    expect(prev.value).toEqual({ n: 2 });
  });

  it('accepts a raw (non-ref) source', () => {
    const prev = usePrevious(5);
    expect(prev.value).toBeUndefined();
  });

  it('stops tracking when the owning scope is disposed', () => {
    const count = ref(0);
    const scope = effectScope();

    const prev = scope.run(() => usePrevious(count))!;

    count.value = 1;
    expect(prev.value).toBe(0);

    scope.stop();

    count.value = 2;
    // watcher is torn down with the scope, so the previous value is frozen
    expect(prev.value).toBe(0);
  });
});
