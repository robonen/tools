import { describe, expect, it, vi } from 'vitest';
import { computed, effectScope, isReadonly, isRef, nextTick, ref, watch } from 'vue';
import type { ComputedRefWithControl } from '.';
import { computedWithControl, controlledComputed } from '.';

describe(computedWithControl, () => {
  it('is a ref that reflects the getter', () => {
    const source = ref(1);
    const result = computedWithControl(source, () => source.value * 2);

    expect(isRef(result)).toBeTruthy();
    expect(result.value).toBe(2);
  });

  it('only recomputes when the controlled source changes', () => {
    const source = ref(1);
    const unrelated = ref(10);
    const getter = vi.fn(() => source.value + unrelated.value);
    const result = computedWithControl(source, getter);

    // first access computes lazily
    expect(result.value).toBe(11);
    expect(getter).toHaveBeenCalledTimes(1);

    // reading again is cached
    expect(result.value).toBe(11);
    expect(getter).toHaveBeenCalledTimes(1);

    // mutating an undeclared dependency does NOT recompute
    unrelated.value = 20;
    expect(result.value).toBe(11);
    expect(getter).toHaveBeenCalledTimes(1);

    // mutating the declared source recomputes (and now picks up unrelated too)
    source.value = 2;
    expect(result.value).toBe(22);
    expect(getter).toHaveBeenCalledTimes(2);
  });

  it('is lazy: the getter does not run until first access', () => {
    const getter = vi.fn(() => 42);
    computedWithControl(ref(0), getter);

    expect(getter).not.toHaveBeenCalled();
  });

  it('passes the previous value to the getter', () => {
    const source = ref(0);
    const seen: Array<number | undefined> = [];
    const result = computedWithControl(source, (prev?: number) => {
      seen.push(prev);

      return source.value;
    });

    expect(result.value).toBe(0);
    source.value = 5;
    expect(result.value).toBe(5);

    expect(seen).toEqual([undefined, 0]);
  });

  it('triggers reactive effects when the source changes', () => {
    const scope = effectScope();
    const source = ref(1);
    const spy = vi.fn();
    let result: ComputedRefWithControl<number>;

    scope.run(() => {
      result = computedWithControl(source, () => source.value * 2);
      watch(result, spy, { flush: 'sync' });
    });

    source.value = 2;
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith(4, 2, expect.anything());

    scope.stop();
  });

  it('is reactive inside a downstream computed', () => {
    const source = ref(2);
    const controlled = computedWithControl(source, () => source.value);
    const doubled = computed(() => controlled.value * 2);

    expect(doubled.value).toBe(4);
    source.value = 3;
    expect(doubled.value).toBe(6);
  });

  describe('trigger', () => {
    it('forces recomputation for sources Vue cannot track', () => {
      let external = 0;
      const result = computedWithControl(() => {}, () => external);

      expect(result.value).toBe(0);

      external = 10;
      // not picked up automatically
      expect(result.value).toBe(0);

      result.trigger();
      expect(result.value).toBe(10);
    });

    it('notifies subscribers', () => {
      const scope = effectScope();
      let external = 1;
      const spy = vi.fn();
      let result: ComputedRefWithControl<number>;

      scope.run(() => {
        result = computedWithControl(() => {}, () => external);
        watch(result, spy, { flush: 'sync' });
      });

      external = 2;
      result!.trigger();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenLastCalledWith(2, 1, expect.anything());

      scope.stop();
    });
  });

  describe('peek', () => {
    it('reads the value without registering customRef tracking', () => {
      const scope = effectScope();
      // drive the value from an external (non-reactive) source so the only
      // reactive dependency a tracked read could create is the customRef itself
      let external = 0;
      const result = computedWithControl(() => {}, () => external);
      let reads = 0;

      scope.run(() => {
        watch(() => result.peek(), () => {
          reads++;
        }, { flush: 'sync' });
      });

      external = 1;
      result.trigger();
      // the outer watcher did NOT re-run, because peek() never tracked the ref
      expect(reads).toBe(0);
      expect(result.peek()).toBe(1);

      scope.stop();
    });

    it('computes lazily on first peek without tracking', () => {
      const source = ref(7);
      const getter = vi.fn(() => source.value);
      const result = computedWithControl(source, getter);

      expect(result.peek()).toBe(7);
      expect(getter).toHaveBeenCalledTimes(1);
    });
  });

  describe('writable computed', () => {
    it('supports get and set', () => {
      const base = ref(1);
      const doubled = computedWithControl(base, {
        get: () => base.value * 2,
        set: (v: number) => {
          base.value = v / 2;
        },
      });

      expect(doubled.value).toBe(2);

      doubled.value = 10;
      expect(base.value).toBe(5);
      // source changed, so the controlled value recomputes
      expect(doubled.value).toBe(10);
    });

    it('is not readonly when a setter is provided', () => {
      const base = ref(1);
      const writable = computedWithControl(base, {
        get: () => base.value,
        set: (v: number) => {
          base.value = v;
        },
      });

      expect(isReadonly(writable)).toBeFalsy();
    });
  });

  describe('multiple sources', () => {
    it('recomputes when any source in the array changes', () => {
      const a = ref(1);
      const b = ref(2);
      const getter = vi.fn(() => a.value + b.value);
      const result = computedWithControl([a, b], getter);

      expect(result.value).toBe(3);
      expect(getter).toHaveBeenCalledTimes(1);

      a.value = 10;
      expect(result.value).toBe(12);

      b.value = 20;
      expect(result.value).toBe(30);
      expect(getter).toHaveBeenCalledTimes(3);
    });
  });

  describe('stop', () => {
    it('detaches the source watcher', () => {
      const source = ref(1);
      const getter = vi.fn(() => source.value);
      const result = computedWithControl(source, getter);

      expect(result.value).toBe(1);
      result.stop();

      source.value = 5;
      // watcher gone, so no recompute happens
      expect(result.value).toBe(1);
      expect(getter).toHaveBeenCalledTimes(1);

      // manual trigger still works
      result.trigger();
      expect(result.value).toBe(5);
    });
  });

  it('forwards custom watch options (flush: post)', async () => {
    const scope = effectScope();
    const source = ref(0);
    const spy = vi.fn();
    let result: ComputedRefWithControl<number>;

    scope.run(() => {
      result = computedWithControl(source, () => source.value, { flush: 'post' });
      watch(result, spy, { flush: 'post' });
    });

    source.value = 1;
    expect(spy).not.toHaveBeenCalled();

    await nextTick();
    expect(result!.value).toBe(1);
    expect(spy).toHaveBeenCalledTimes(1);

    scope.stop();
  });

  it('exposes controlledComputed as an alias', () => {
    expect(controlledComputed).toBe(computedWithControl);

    const source = ref('a');
    const result = controlledComputed(source, () => source.value.toUpperCase());
    expect(result.value).toBe('A');
    source.value = 'b';
    expect(result.value).toBe('B');
  });

  it('runs without an active effect scope (SSR-style, no host component)', () => {
    // No effectScope / no component: the customRef + sync watcher must still
    // work, and reading must not throw even though there are no subscribers.
    let external = 1;
    const result = computedWithControl(() => {}, () => external);

    expect(result.value).toBe(1);
    external = 2;
    result.trigger();
    expect(result.value).toBe(2);
    expect(result.peek()).toBe(2);
  });
});
