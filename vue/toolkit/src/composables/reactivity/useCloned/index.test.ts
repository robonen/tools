import { describe, expect, it, vi } from 'vitest';
import { nextTick, reactive, ref } from 'vue';
import { cloneFnDefault, useCloned } from '.';

describe(useCloned, () => {
  it('clones the initial source value (deep, not referentially equal)', () => {
    const source = ref({ nested: { count: 0 } });
    const { cloned } = useCloned(source);

    expect(cloned.value).toEqual({ nested: { count: 0 } });
    expect(cloned.value).not.toBe(source.value);
    expect(cloned.value.nested).not.toBe(source.value.nested);
  });

  it('re-clones automatically when the source ref changes', async () => {
    const source = ref({ count: 0 });
    const { cloned } = useCloned(source);

    source.value = { count: 5 };
    await nextTick();

    expect(cloned.value).toEqual({ count: 5 });
    expect(cloned.value).not.toBe(source.value);
  });

  it('re-clones automatically when a deep source property changes', async () => {
    const source = ref({ nested: { count: 0 } });
    const { cloned } = useCloned(source);

    source.value.nested.count = 9;
    await nextTick();

    expect(cloned.value.nested.count).toBe(9);
  });

  it('tracks modification of the cloned value via isModified', () => {
    const source = ref({ count: 0 });
    const { cloned, isModified } = useCloned(source);

    expect(isModified.value).toBeFalsy();

    cloned.value.count = 1;

    expect(isModified.value).toBeTruthy();
  });

  it('does not set isModified when the change came from a source sync', async () => {
    const source = ref({ count: 0 });
    const { isModified } = useCloned(source);

    source.value = { count: 1 };
    await nextTick();

    expect(isModified.value).toBeFalsy();
  });

  it('sync() re-clones from source and resets isModified', () => {
    const source = ref({ count: 0 });
    const { cloned, isModified, sync } = useCloned(source);

    cloned.value.count = 42;
    expect(isModified.value).toBeTruthy();

    sync();

    expect(cloned.value).toEqual({ count: 0 });
    expect(isModified.value).toBeFalsy();
  });

  it('manual mode does not auto-sync on source change', async () => {
    const source = ref({ count: 0 });
    const { cloned, sync } = useCloned(source, { manual: true });

    expect(cloned.value).toEqual({ count: 0 });

    source.value = { count: 100 };
    await nextTick();

    // still the original clone, manual mode ignores source changes
    expect(cloned.value).toEqual({ count: 0 });

    sync();
    expect(cloned.value).toEqual({ count: 100 });
  });

  it('supports a getter source', async () => {
    const state = reactive({ count: 1 });
    const { cloned } = useCloned(() => ({ count: state.count }));

    expect(cloned.value).toEqual({ count: 1 });

    state.count = 2;
    await nextTick();

    expect(cloned.value).toEqual({ count: 2 });
  });

  it('supports a plain (non-reactive) source value', () => {
    const { cloned, isModified } = useCloned({ count: 7 });

    expect(cloned.value).toEqual({ count: 7 });
    expect(isModified.value).toBeFalsy();
  });

  it('uses a custom clone function when provided', () => {
    const clone = vi.fn((s: { count: number }) => ({ count: s.count + 1 }));
    const source = ref({ count: 10 });
    const { cloned } = useCloned(source, { clone });

    expect(clone).toHaveBeenCalled();
    expect(cloned.value).toEqual({ count: 11 });
  });

  it('respects immediate: false (no clone until source changes)', async () => {
    const source = ref({ count: 0 });
    const { cloned } = useCloned(source, { immediate: false });

    // not yet synced
    expect(cloned.value).toBeUndefined();

    source.value = { count: 3 };
    await nextTick();

    expect(cloned.value).toEqual({ count: 3 });
  });
});

describe(cloneFnDefault, () => {
  it('deep clones via structuredClone when available', () => {
    const input = { a: 1, b: { c: [1, 2, 3] }, d: new Date(0) };
    const out = cloneFnDefault(input);

    expect(out).toEqual(input);
    expect(out).not.toBe(input);
    expect(out.b).not.toBe(input.b);
    expect(out.d).toBeInstanceOf(Date);
  });

  it('falls back to JSON when structuredClone is unavailable (SSR / old runtime)', () => {
    const original = globalThis.structuredClone;
    // simulate environment without structuredClone
    (globalThis as { structuredClone?: unknown }).structuredClone = undefined;

    try {
      const input = { a: 1, b: { c: 2 } };
      const out = cloneFnDefault(input);

      expect(out).toEqual(input);
      expect(out).not.toBe(input);
      expect(out.b).not.toBe(input.b);
    }
    finally {
      globalThis.structuredClone = original;
    }
  });

  it('falls back to JSON when the value is not structured-cloneable', () => {
    // functions are not structured-cloneable; JSON drops them
    const input = { keep: 1, fn: () => {} };
    const out = cloneFnDefault(input) as { keep: number; fn?: unknown };

    expect(out.keep).toBe(1);
    expect(out.fn).toBeUndefined();
  });
});
