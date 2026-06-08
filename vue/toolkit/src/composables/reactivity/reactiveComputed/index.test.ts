import { describe, expect, it, vi } from 'vitest';
import { effectScope, isReactive, nextTick, ref, toRefs, watch } from 'vue';
import { reactiveComputed } from '.';

describe(reactiveComputed, () => {
  it('returns a reactive object backed by the getter', () => {
    const count = ref(1);
    const state = reactiveComputed(() => ({
      foo: count.value,
      bar: count.value * 2,
    }));

    expect(isReactive(state)).toBeTruthy();
    expect(state.foo).toBe(1);
    expect(state.bar).toBe(2);
  });

  it('updates field values when a dependency changes', async () => {
    const count = ref(1);
    const state = reactiveComputed(() => ({
      doubled: count.value * 2,
    }));

    expect(state.doubled).toBe(2);
    count.value = 5;
    await nextTick();
    expect(state.doubled).toBe(10);
  });

  it('only re-runs the getter when a dependency changes (cached)', () => {
    const count = ref(1);
    const getter = vi.fn(() => ({ value: count.value }));
    const state = reactiveComputed(getter);

    // Multiple reads of the same / different keys without a dep change
    // should not re-invoke the getter beyond the first lazy evaluation.
    void state.value;
    void state.value;
    void state.value;
    expect(getter).toHaveBeenCalledTimes(1);

    count.value = 2;
    void state.value;
    expect(getter).toHaveBeenCalledTimes(2);
  });

  it('tracks individual fields independently', async () => {
    const a = ref(0);
    const b = ref(0);
    const state = reactiveComputed(() => ({
      a: a.value,
      b: b.value,
    }));

    const spyA = vi.fn();
    const scope = effectScope();
    scope.run(() => {
      watch(() => state.a, spyA);
    });

    // Changing `b` should not trigger a watcher on `a`.
    b.value = 1;
    await nextTick();
    expect(spyA).not.toHaveBeenCalled();

    a.value = 1;
    await nextTick();
    expect(spyA).toHaveBeenCalledTimes(1);

    scope.stop();
  });

  it('unwraps nested refs returned by the getter', () => {
    const name = ref('alice');
    const state = reactiveComputed(() => ({ name }));

    expect(state.name).toBe('alice');
  });

  it('writes a raw value through to an underlying ref', async () => {
    const name = ref('alice');
    const state = reactiveComputed(() => ({ name }));

    state.name = 'bob';
    expect(name.value).toBe('bob');
    await nextTick();
    expect(state.name).toBe('bob');
  });

  it('writes plain (non-ref) fields back onto the computed value', () => {
    const state = reactiveComputed<{ count: number }>(() => ({ count: 1 }));

    state.count = 42;
    expect(state.count).toBe(42);
  });

  it('supports the `in` operator via the has trap', () => {
    const state = reactiveComputed(() => ({ foo: 1 }));

    expect('foo' in state).toBeTruthy();
    expect('missing' in state).toBeFalsy();
  });

  it('enumerates own keys', () => {
    const state = reactiveComputed(() => ({ a: 1, b: 2, c: 3 }));

    expect(Object.keys(state).sort()).toEqual(['a', 'b', 'c']);
  });

  it('supports property deletion', () => {
    const state = reactiveComputed<{ a?: number; b: number }>(() => ({ a: 1, b: 2 }));

    delete state.a;
    expect('a' in state).toBeFalsy();
    expect('b' in state).toBeTruthy();
  });

  it('works with toRefs while preserving reactivity', async () => {
    const count = ref(1);
    const state = reactiveComputed(() => ({ doubled: count.value * 2 }));
    const { doubled } = toRefs(state);

    expect(doubled.value).toBe(2);
    count.value = 3;
    await nextTick();
    expect(doubled.value).toBe(6);
  });

  it('is observable by a deep watcher', async () => {
    const count = ref(1);
    const state = reactiveComputed(() => ({ count: count.value }));
    const spy = vi.fn();

    const scope = effectScope();
    scope.run(() => {
      watch(state, spy, { deep: true });
    });

    count.value = 2;
    await nextTick();
    expect(spy).toHaveBeenCalledTimes(1);

    scope.stop();
  });

  it('handles getters returning nested object structures', async () => {
    const open = ref(false);
    const state = reactiveComputed(() => ({
      ui: {
        open: open.value,
      },
    }));

    expect(state.ui.open).toBeFalsy();
    open.value = true;
    await nextTick();
    expect(state.ui.open).toBeTruthy();
  });
});
