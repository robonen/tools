import { describe, expect, it, vi } from 'vitest';
import { computed, effectScope, isRef, nextTick, watch } from 'vue';
import { controlledRef, refWithControl } from '.';

describe(refWithControl, () => {
  it('behaves like a normal ref by default', () => {
    const num = refWithControl(0);

    expect(isRef(num)).toBeTruthy();
    expect(num.value).toBe(0);

    num.value = 1;
    expect(num.value).toBe(1);

    num.value++;
    expect(num.value).toBe(2);
  });

  it('triggers reactive effects on a tracked set', async () => {
    const scope = effectScope();
    const num = refWithControl(0);
    const spy = vi.fn();

    scope.run(() => {
      watch(num, spy, { flush: 'sync' });
    });

    num.value = 5;
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith(5, 0, expect.anything());

    scope.stop();
  });

  it('is reactive inside computed', () => {
    const num = refWithControl(2);
    const double = computed(() => num.value * 2);

    expect(double.value).toBe(4);
    num.value = 3;
    expect(double.value).toBe(6);
  });

  it('does not trigger effects when the value is unchanged', () => {
    const scope = effectScope();
    const num = refWithControl(0);
    const spy = vi.fn();

    scope.run(() => {
      watch(num, spy, { flush: 'sync' });
    });

    num.value = 0;
    expect(spy).not.toHaveBeenCalled();

    scope.stop();
  });

  describe('peek / untrackedGet', () => {
    it('reads the current value', () => {
      const num = refWithControl(42);
      expect(num.peek()).toBe(42);
      expect(num.untrackedGet()).toBe(42);
    });

    it('does not register reactive tracking', () => {
      const scope = effectScope();
      const num = refWithControl(0);
      let read = 0;

      scope.run(() => {
        watch(() => num.peek(), () => {
          read++;
        }, { flush: 'sync' });
      });

      num.value = 1;
      expect(read).toBe(0);

      scope.stop();
    });
  });

  describe('lay / silentSet', () => {
    it('writes without triggering effects', () => {
      const scope = effectScope();
      const num = refWithControl(0);
      const spy = vi.fn();

      scope.run(() => {
        watch(num, spy, { flush: 'sync' });
      });

      num.lay(10);
      expect(num.peek()).toBe(10);
      expect(spy).not.toHaveBeenCalled();

      num.silentSet(20);
      expect(num.peek()).toBe(20);
      expect(spy).not.toHaveBeenCalled();

      scope.stop();
    });
  });

  describe('get / set explicit control', () => {
    it('get(false) skips tracking and set(v, false) skips triggering', () => {
      const scope = effectScope();
      const num = refWithControl(0);
      const spy = vi.fn();

      scope.run(() => {
        watch(num, spy, { flush: 'sync' });
      });

      expect(num.get(false)).toBe(0);
      num.set(7, false);
      expect(num.get()).toBe(7);
      expect(spy).not.toHaveBeenCalled();

      num.set(8);
      expect(spy).toHaveBeenCalledTimes(1);

      scope.stop();
    });
  });

  describe('onBeforeChange', () => {
    it('receives the new and old value', () => {
      const onBeforeChange = vi.fn();
      const num = refWithControl(1 as number, { onBeforeChange });

      num.value = 2;
      expect(onBeforeChange).toHaveBeenCalledWith(2, 1);
    });

    it('rejects the change when it returns false', () => {
      const num = refWithControl(1, {
        onBeforeChange: value => value > 0,
      });

      num.value = 5;
      expect(num.value).toBe(5);

      num.value = -1;
      expect(num.value).toBe(5);
    });

    it('allows the change for any non-false return', () => {
      const num = refWithControl(0, {
        onBeforeChange: () => undefined,
      });

      num.value = 3;
      expect(num.value).toBe(3);
    });

    it('runs on silent sets too and can still veto', () => {
      const num = refWithControl(0, {
        onBeforeChange: value => value !== 99,
      });

      num.lay(99);
      expect(num.peek()).toBe(0);

      num.lay(7);
      expect(num.peek()).toBe(7);
    });
  });

  describe('onChanged', () => {
    it('fires after a tracked change', () => {
      const onChanged = vi.fn();
      const num = refWithControl(1 as number, { onChanged });

      num.value = 2;
      expect(onChanged).toHaveBeenCalledWith(2, 1);
    });

    it('fires on silent sets as well', () => {
      const onChanged = vi.fn();
      const num = refWithControl(0 as number, { onChanged });

      num.silentSet(9);
      expect(onChanged).toHaveBeenCalledWith(9, 0);
    });

    it('does not fire when the change was vetoed', () => {
      const onChanged = vi.fn();
      const num = refWithControl(0 as number, {
        onBeforeChange: () => false,
        onChanged,
      });

      num.value = 1;
      expect(onChanged).not.toHaveBeenCalled();
      expect(num.value).toBe(0);
    });

    it('does not fire when the value is unchanged', () => {
      const onChanged = vi.fn();
      const num = refWithControl(5, { onChanged });

      num.value = 5;
      expect(onChanged).not.toHaveBeenCalled();
    });
  });

  it('works with post-flush watchers', async () => {
    const scope = effectScope();
    const num = refWithControl(0);
    const spy = vi.fn();

    scope.run(() => {
      watch(num, spy, { flush: 'post' });
    });

    num.value = 1;
    expect(spy).not.toHaveBeenCalled();

    await nextTick();
    expect(spy).toHaveBeenCalledTimes(1);

    scope.stop();
  });

  it('exposes controlledRef as an alias', () => {
    expect(controlledRef).toBe(refWithControl);

    const num = controlledRef('a');
    expect(num.value).toBe('a');
    num.value = 'b';
    expect(num.peek()).toBe('b');
  });

  it('supports object values via reference equality', () => {
    const a = { id: 1 };
    const b = { id: 2 };
    const onChanged = vi.fn();
    const obj = refWithControl(a, { onChanged });

    obj.value = a;
    expect(onChanged).not.toHaveBeenCalled();

    obj.value = b;
    expect(onChanged).toHaveBeenCalledWith(b, a);
    expect(obj.value).toBe(b);
  });
});
