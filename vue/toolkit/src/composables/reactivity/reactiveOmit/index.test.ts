import { describe, expect, it, vi } from 'vitest';
import { computed, effectScope, nextTick, reactive, ref, watch } from 'vue';
import { reactiveOmit } from '.';

describe(reactiveOmit, () => {
  it('omits a single key', () => {
    const source = reactive({ name: 'a', count: 1, hidden: true });
    const result = reactiveOmit(source, 'hidden');
    expect({ ...result }).toEqual({ name: 'a', count: 1 });
  });

  it('omits multiple keys passed variadically', () => {
    const source = reactive({ a: 1, b: 2, c: 3, d: 4 });
    const result = reactiveOmit(source, 'a', 'c');
    expect({ ...result }).toEqual({ b: 2, d: 4 });
  });

  it('omits keys passed as an array', () => {
    const source = reactive({ a: 1, b: 2, c: 3 });
    const result = reactiveOmit(source, ['a', 'b']);
    expect({ ...result }).toEqual({ c: 3 });
  });

  it('omits a mix of single keys and arrays', () => {
    const source = reactive({ a: 1, b: 2, c: 3, d: 4 });
    const result = reactiveOmit(source, 'a', ['c', 'd']);
    expect({ ...result }).toEqual({ b: 2 });
  });

  it('returns a shallow copy of all fields when no keys are given', () => {
    const source = reactive({ a: 1, b: 2 });
    const result = reactiveOmit(source);
    expect({ ...result }).toEqual({ a: 1, b: 2 });
  });

  it('reacts to source mutations', async () => {
    const source = reactive({ a: 1, b: 2, c: 3 });
    const result = reactiveOmit(source, 'c');
    expect(result.a).toBe(1);

    source.a = 10;
    await nextTick();
    expect(result.a).toBe(10);
    expect({ ...result }).toEqual({ a: 10, b: 2 });
  });

  it('reflects keys added to the source after creation', async () => {
    const source = reactive<Record<string, number>>({ a: 1 });
    const result = reactiveOmit(source, 'a');
    expect({ ...result }).toEqual({});

    source.b = 2;
    await nextTick();
    expect({ ...result }).toEqual({ b: 2 });
  });

  it('supports a predicate dropping fields by value', () => {
    const source = reactive({ name: 'a', count: 1, enabled: true });
    const result = reactiveOmit(source, value => typeof value === 'boolean');
    expect({ ...result }).toEqual({ name: 'a', count: 1 });
  });

  it('supports a predicate dropping fields by key', () => {
    const source = reactive({ id: 1, _internal: 2, label: 'x' });
    const result = reactiveOmit(source, (_value, key) => key.startsWith('_'));
    expect({ ...result }).toEqual({ id: 1, label: 'x' });
  });

  it('re-evaluates the predicate reactively', async () => {
    const source = reactive({ a: 1, b: -2, c: 3 });
    const result = reactiveOmit(source, value => (value as number) < 0);
    expect({ ...result }).toEqual({ a: 1, c: 3 });

    source.a = -1;
    await nextTick();
    expect({ ...result }).toEqual({ c: 3 });
  });

  it('unwraps refs held on the source object', () => {
    const count = ref(5);
    const source = reactive({ count, label: 'x' });
    const result = reactiveOmit(source, 'label');
    expect(result.count).toBe(5);
  });

  it('tracks only the accessed field (granular reactivity)', async () => {
    const source = reactive({ a: 1, b: 2, c: 3 });
    const result = reactiveOmit(source, 'c');

    const spy = vi.fn();
    const scope = effectScope();
    scope.run(() => {
      watch(() => result.a, spy);
    });

    // Mutating an unwatched field must not trigger the `a` watcher.
    source.b = 20;
    await nextTick();
    expect(spy).not.toHaveBeenCalled();

    source.a = 10;
    await nextTick();
    expect(spy).toHaveBeenCalledTimes(1);

    scope.stop();
  });

  it('does not re-run the getter for an untouched dependency (cached computed)', async () => {
    const source = reactive({ a: 1, b: 2 });
    const getter = vi.fn(() => source.a);
    const tracked = computed(getter);

    const result = reactiveOmit(reactive({ value: tracked, other: 99 }), 'other');
    expect(result.value).toBe(1);
    expect(getter).toHaveBeenCalledTimes(1);

    // Reading again without changing the dependency does not re-run the getter.
    expect(result.value).toBe(1);
    expect(getter).toHaveBeenCalledTimes(1);

    source.a = 2;
    await nextTick();
    expect(result.value).toBe(2);
  });

  it('works on a plain (non-reactive) source object', () => {
    const result = reactiveOmit({ a: 1, b: 2, c: 3 }, 'b');
    expect({ ...result }).toEqual({ a: 1, c: 3 });
  });

  it('is SSR-safe (no DOM globals touched, runs without window)', () => {
    const original = globalThis.window;
    // @ts-expect-error force a non-DOM environment for the duration of the call
    delete globalThis.window;
    try {
      const source = reactive({ a: 1, secret: 2 });
      const result = reactiveOmit(source, 'secret');
      expect({ ...result }).toEqual({ a: 1 });
    }
    finally {
      globalThis.window = original;
    }
  });
});
