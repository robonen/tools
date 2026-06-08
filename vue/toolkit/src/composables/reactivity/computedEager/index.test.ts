import { describe, expect, it, vi } from 'vitest';
import { computed, effectScope, isReadonly, nextTick, ref } from 'vue';
import { computedEager, eagerComputed } from '.';

describe(computedEager, () => {
  it('computes the initial value eagerly', () => {
    const count = ref(2);
    const doubled = computedEager(() => count.value * 2);
    expect(doubled.value).toBe(4);
  });

  it('updates synchronously when a dependency changes', () => {
    const count = ref(0);
    const isEven = computedEager(() => count.value % 2 === 0);

    expect(isEven.value).toBeTruthy();

    count.value = 1;
    // no flush/tick needed with the default sync flush
    expect(isEven.value).toBeFalsy();

    count.value = 4;
    expect(isEven.value).toBeTruthy();
  });

  it('tracks multiple reactive sources', () => {
    const a = ref(1);
    const b = ref(2);
    const sum = computedEager(() => a.value + b.value);

    expect(sum.value).toBe(3);

    a.value = 10;
    expect(sum.value).toBe(12);

    b.value = 20;
    expect(sum.value).toBe(30);
  });

  it('depends on other computed refs', () => {
    const n = ref(3);
    const squared = computed(() => n.value * n.value);
    const label = computedEager(() => `value:${squared.value}`);

    expect(label.value).toBe('value:9');

    n.value = 4;
    expect(label.value).toBe('value:16');
  });

  it('returns a readonly ref', () => {
    const count = ref(0);
    const derived = computedEager(() => count.value);
    expect(isReadonly(derived)).toBeTruthy();
  });

  it('does not mutate when writing to the readonly ref (warns instead)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const count = ref(5);
    const derived = computedEager(() => count.value);
    // @ts-expect-error: readonly ref must not be writable at the type level
    derived.value = 99;
    expect(derived.value).toBe(5);
    warn.mockRestore();
  });

  it('is eager rather than lazy: getter runs without being read', () => {
    const count = ref(0);
    const spy = vi.fn(() => count.value);

    computedEager(spy);
    // eager: getter ran once on creation even though .value was never read
    expect(spy).toHaveBeenCalledTimes(1);

    count.value = 1;
    // and again on dependency change, still without any read
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('respects a custom flush timing', async () => {
    const count = ref(0);
    const derived = computedEager(() => count.value, { flush: 'post' });

    // initial post-flush effect resolves after a tick
    await nextTick();
    expect(derived.value).toBe(0);

    count.value = 1;
    // post flush is deferred until after the next tick
    expect(derived.value).toBe(0);

    await nextTick();
    expect(derived.value).toBe(1);
  });

  it('stops recomputing when the owning scope is disposed', () => {
    const count = ref(0);
    const scope = effectScope();

    const derived = scope.run(() => computedEager(() => count.value))!;

    count.value = 1;
    expect(derived.value).toBe(1);

    scope.stop();

    count.value = 2;
    // effect is torn down with the scope, so the value is frozen
    expect(derived.value).toBe(1);
  });

  it('handles getters that return objects', () => {
    const flag = ref(true);
    const obj = computedEager(() => ({ ok: flag.value }));

    expect(obj.value).toEqual({ ok: true });

    flag.value = false;
    expect(obj.value).toEqual({ ok: false });
  });

  it('exposes eagerComputed as an alias of computedEager', () => {
    expect(eagerComputed).toBe(computedEager);

    const count = ref(1);
    const derived = eagerComputed(() => count.value + 1);
    expect(derived.value).toBe(2);

    count.value = 9;
    expect(derived.value).toBe(10);
  });
});
