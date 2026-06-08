import { describe, expect, it, vi } from 'vitest';
import { computed, effectScope, nextTick } from 'vue';
import type { ComputedRef } from 'vue';
import { useMemoize } from '.';
import type { UseMemoizeCache } from '.';

describe(useMemoize, () => {
  it('computes once and returns the cached result on subsequent calls', () => {
    const fn = vi.fn((n: number) => n * 2);
    const memoized = useMemoize(fn);

    expect(memoized(2)).toBe(4);
    expect(memoized(2)).toBe(4);
    expect(memoized(3)).toBe(6);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('distinguishes calls by serialized arguments', () => {
    const fn = vi.fn((a: number, b: number) => a + b);
    const memoized = useMemoize(fn);

    memoized(1, 2);
    memoized(1, 2);
    memoized(2, 1);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('matches object arguments by value via the default JSON key', () => {
    const fn = vi.fn((o: { id: number }) => o.id);
    const memoized = useMemoize(fn);

    expect(memoized({ id: 1 })).toBe(1);
    // Different object reference, same shape -> cache hit.
    expect(memoized({ id: 1 })).toBe(1);

    expect(fn).toHaveBeenCalledOnce();
  });

  describe('async resolver', () => {
    it('caches the returned promise so repeated calls share one invocation', async () => {
      const fn = vi.fn(async (id: number) => `user-${id}`);
      const memoized = useMemoize(fn);

      const p1 = memoized(1);
      const p2 = memoized(1);

      expect(p1).toBe(p2);
      await expect(p1).resolves.toBe('user-1');
      expect(fn).toHaveBeenCalledOnce();
    });
  });

  describe('load', () => {
    it('recomputes and overwrites the cache, bypassing a hit', () => {
      let value = 10;
      const fn = vi.fn(() => value);
      const memoized = useMemoize(fn);

      expect(memoized()).toBe(10);
      value = 20;
      // Plain read is still cached.
      expect(memoized()).toBe(10);
      // load forces a recompute and updates the cache.
      expect(memoized.load()).toBe(20);
      expect(memoized()).toBe(20);

      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('delete', () => {
    it('evicts a single cached entry', () => {
      const fn = vi.fn((n: number) => n * n);
      const memoized = useMemoize(fn);

      memoized(2);
      memoized(3);
      memoized.delete(2);

      memoized(2); // recompute
      memoized(3); // still cached

      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('clear', () => {
    it('drops every cached entry', () => {
      const fn = vi.fn((n: number) => n + 1);
      const memoized = useMemoize(fn);

      memoized(1);
      memoized(2);
      memoized.clear();
      memoized(1);
      memoized(2);

      expect(fn).toHaveBeenCalledTimes(4);
    });
  });

  describe('generateKey', () => {
    it('produces the same key the cache uses, without touching the cache', () => {
      const fn = vi.fn((a: number, b: number) => a + b);
      const memoized = useMemoize(fn);

      const key = memoized.generateKey(1, 2);
      expect(key).toBe(JSON.stringify([1, 2]));
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('getKey option', () => {
    it('uses the custom key resolver for cache identity', () => {
      const fn = vi.fn((o: { id: number; name: string }) => o.name);
      const memoized = useMemoize(fn, { getKey: o => o.id });

      memoized({ id: 1, name: 'a' });
      // Same id, different name -> cache hit because key is the id only.
      const second = memoized({ id: 1, name: 'b' });

      expect(second).toBe('a');
      expect(memoized.generateKey({ id: 7, name: 'x' })).toBe(7);
      expect(fn).toHaveBeenCalledOnce();
    });
  });

  describe('custom cache backend', () => {
    it('routes get/set/has/delete/clear through the supplied cache', () => {
      const store = new Map<PropertyKey, number>();
      const cache: UseMemoizeCache<PropertyKey, number> = {
        get: k => store.get(k),
        set: (k, v) => void store.set(k, v),
        has: k => store.has(k),
        delete: k => void store.delete(k),
        clear: () => store.clear(),
      };
      const fn = vi.fn((n: number) => n * 3);
      const memoized = useMemoize(fn, { cache, getKey: n => n });

      expect(memoized(4)).toBe(12);
      expect(memoized(4)).toBe(12);
      expect(store.get(4)).toBe(12);
      expect(fn).toHaveBeenCalledOnce();

      memoized.delete(4);
      expect(store.has(4)).toBeFalsy();

      memoized(4);
      memoized.clear();
      expect(store.size).toBe(0);
    });
  });

  describe('reactivity', () => {
    it('re-evaluates a computed reading the cache as entries change', async () => {
      const scope = effectScope();
      let size!: ComputedRef<number>;
      let memoized!: ReturnType<typeof useMemoize<number, [number]>>;

      scope.run(() => {
        memoized = useMemoize((n: number) => n * n, { getKey: n => n });
        size = computed(() => (memoized.cache as unknown as Map<number, number>).size);
      });

      expect(size.value).toBe(0);

      memoized(2);
      await nextTick();
      expect(size.value).toBe(1);

      memoized(3);
      await nextTick();
      expect(size.value).toBe(2);

      memoized.clear();
      await nextTick();
      expect(size.value).toBe(0);

      scope.stop();
    });
  });

  describe('SSR safety', () => {
    it('works without any browser globals (no window/document/navigator access)', () => {
      const win = globalThis.window;
      const doc = globalThis.document;
      const nav = globalThis.navigator;

      try {
        // Simulate a server environment: globals absent.
        // @ts-expect-error force-delete for the test
        delete globalThis.window;
        // @ts-expect-error force-delete for the test
        delete globalThis.document;
        // @ts-expect-error force-delete for the test
        delete globalThis.navigator;

        const fn = vi.fn((n: number) => n + 100);
        const memoized = useMemoize(fn);

        expect(memoized(1)).toBe(101);
        expect(memoized(1)).toBe(101);
        expect(memoized.generateKey(1)).toBe(JSON.stringify([1]));
        expect(fn).toHaveBeenCalledOnce();
      }
      finally {
        globalThis.window = win;
        globalThis.document = doc;
        globalThis.navigator = nav;
      }
    });
  });
});
