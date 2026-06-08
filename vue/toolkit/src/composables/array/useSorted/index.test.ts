import { describe, expect, it } from 'vitest';
import { isReactive, nextTick, reactive, ref } from 'vue';
import type { Ref } from 'vue';
import { useSorted } from '.';

describe(useSorted, () => {
  it('returns a sorted copy with the default numeric compare', () => {
    const source = ref([3, 1, 2]);
    const sorted = useSorted(source);
    expect(sorted.value).toEqual([1, 2, 3]);
  });

  it('does not mutate the source by default', () => {
    const original = [3, 1, 2];
    const source = ref(original);
    const sorted = useSorted(source);
    expect(sorted.value).toEqual([1, 2, 3]);
    expect(source.value).toEqual([3, 1, 2]);
    expect(sorted.value).not.toBe(source.value);
  });

  it('reacts to source changes', () => {
    const source = ref([3, 1, 2]);
    const sorted = useSorted(source);
    expect(sorted.value).toEqual([1, 2, 3]);
    source.value = [9, 5, 7, 1];
    expect(sorted.value).toEqual([1, 5, 7, 9]);
  });

  it('supports a custom compare function as the second argument', () => {
    const source = ref([{ age: 30 }, { age: 18 }, { age: 25 }]);
    const sorted = useSorted(source, (a, b) => a.age - b.age);
    expect(sorted.value.map(u => u.age)).toEqual([18, 25, 30]);
  });

  it('supports descending order via compare function', () => {
    const source = ref([1, 2, 3]);
    const sorted = useSorted(source, (a, b) => b - a);
    expect(sorted.value).toEqual([3, 2, 1]);
  });

  it('accepts an options object as the second argument', () => {
    const source = ref([3, 1, 2]);
    const sorted = useSorted(source, { compareFn: (a, b) => b - a });
    expect(sorted.value).toEqual([3, 2, 1]);
  });

  it('accepts a compare function plus an options object', () => {
    const calls: number[] = [];
    const sortFn = <T>(arr: T[], compareFn: (a: T, b: T) => number): T[] => {
      calls.push(arr.length);
      return [...arr].sort(compareFn);
    };
    const source = ref([3, 1, 2]);
    const sorted = useSorted(source, (a, b) => a - b, { sortFn });
    expect(sorted.value).toEqual([1, 2, 3]);
    expect(calls.length).toBeGreaterThan(0);
  });

  it('is stable: equal elements keep their original relative order', () => {
    const source = ref([
      { k: 1, id: 'a' },
      { k: 1, id: 'b' },
      { k: 0, id: 'c' },
      { k: 1, id: 'd' },
    ]);
    const sorted = useSorted(source, (a, b) => a.k - b.k);
    expect(sorted.value.map(x => x.id)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('works with getter sources', () => {
    const base = ref([5, 3, 4]);
    const sorted = useSorted(() => base.value);
    expect(sorted.value).toEqual([3, 4, 5]);
    base.value = [2, 1];
    expect(sorted.value).toEqual([1, 2]);
  });

  it('works with a plain (non-reactive) array source', () => {
    const sorted = useSorted([3, 1, 2]);
    expect(sorted.value).toEqual([1, 2, 3]);
  });

  it('handles empty and single-element arrays', () => {
    expect(useSorted(ref<number[]>([])).value).toEqual([]);
    expect(useSorted(ref([42])).value).toEqual([42]);
  });

  describe('dirty mode', () => {
    it('sorts the source ref in place', async () => {
      const source = ref([3, 1, 2]);
      const result = useSorted(source, { dirty: true });
      await nextTick();
      expect(source.value).toEqual([1, 2, 3]);
      expect(result).toBe(source);
    });

    it('re-sorts when the source changes', async () => {
      const source = ref([3, 1, 2]);
      useSorted(source, { dirty: true });
      await nextTick();
      expect(source.value).toEqual([1, 2, 3]);
      source.value = [9, 4, 6];
      await nextTick();
      expect(source.value).toEqual([4, 6, 9]);
    });

    it('honors a custom compare function in dirty mode', async () => {
      const source = ref([1, 2, 3]);
      useSorted(source, (a, b) => b - a, { dirty: true });
      await nextTick();
      expect(source.value).toEqual([3, 2, 1]);
    });

    it('mutates a reactive array source in place via a getter', async () => {
      const source = reactive([3, 1, 2]);
      useSorted(() => source, { dirty: true });
      await nextTick();
      expect(isReactive(source)).toBeTruthy();
      expect([...source]).toEqual([1, 2, 3]);
    });
  });

  describe('writable result', () => {
    it('writes back to the source ref when assigned (non-dirty)', () => {
      const source = ref([3, 1, 2]);
      const sorted = useSorted(source);
      sorted.value = [10, 20];
      expect(source.value).toEqual([10, 20]);
    });

    it('silently ignores writes when the source is a getter', () => {
      const base = ref([3, 1, 2]);
      const sorted = useSorted(() => base.value) as unknown as Ref<number[]>;
      expect(() => {
        sorted.value = [10, 20];
      }).not.toThrow();
      // getter source is unchanged
      expect(base.value).toEqual([3, 1, 2]);
    });
  });

  describe('SSR safety', () => {
    it('does not touch any DOM global and works without a document', () => {
      // useSorted is pure reactive computation; it must run identically in SSR.
      const sorted = useSorted(ref([3, 1, 2]));
      expect(sorted.value).toEqual([1, 2, 3]);
    });
  });
});
