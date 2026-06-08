import { afterEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useArrayFindLast } from '.';

describe(useArrayFindLast, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('finds the last matching element reactively', () => {
    const list = ref([1, 2, 3, 4]);
    const found = useArrayFindLast(list, n => n % 2 === 0);
    expect(found.value).toBe(4);

    list.value = [10, 20, 21];
    expect(found.value).toBe(20);
  });

  it('returns undefined when nothing matches', () => {
    const found = useArrayFindLast(ref([1, 2]), n => n > 5);
    expect(found.value).toBeUndefined();
  });

  it('returns undefined for an empty array', () => {
    const found = useArrayFindLast(ref<number[]>([]), () => true);
    expect(found.value).toBeUndefined();
  });

  it('returns the LAST matching element', () => {
    const found = useArrayFindLast(ref([2, 4, 6, 8]), n => n % 2 === 0);
    expect(found.value).toBe(8);
  });

  it('passes element, index and the resolved array to the predicate', () => {
    const calls: Array<[number, number, number[]]> = [];
    const found = useArrayFindLast(ref([5, 6, 7]), (element, idx, array) => {
      calls.push([element, idx, array]);
      return element === 7;
    });

    expect(found.value).toBe(7);
    // findLast iterates from the end; the match at index 2 stops it immediately.
    expect(calls).toEqual([
      [7, 2, [5, 6, 7]],
    ]);
  });

  it('unwraps reactive items inside the list', () => {
    const a = ref(1);
    const b = ref(2);
    const found = useArrayFindLast([a, b], n => n < 5);
    expect(found.value).toBe(2);

    b.value = 9;
    expect(found.value).toBe(1);
  });

  it('accepts a getter as the source list', () => {
    const source = ref([3, 4, 5, 6]);
    const found = useArrayFindLast(() => source.value, n => n % 2 === 0);
    expect(found.value).toBe(6);

    source.value = [1, 3, 5];
    expect(found.value).toBeUndefined();
  });

  it('accepts a plain (non-reactive) array', () => {
    const found = useArrayFindLast([10, 20, 30], n => n < 25);
    expect(found.value).toBe(20);
  });

  it('works via the polyfill when Array.prototype.findLast is unavailable', () => {
    const native = Array.prototype.findLast;
    try {
      // Simulate a runtime older than ES2023.
      (Array.prototype as { findLast?: unknown }).findLast = undefined;
      vi.resetModules();
      // The presence check runs at module import time, so re-import here.
      return import('.').then(({ useArrayFindLast: useArrayFindLastFresh }) => {
        const found = useArrayFindLastFresh(ref([1, 2, 3, 4]), n => n % 2 === 0);
        expect(found.value).toBe(4);

        const none = useArrayFindLastFresh(ref([1, 3, 5]), n => n % 2 === 0);
        expect(none.value).toBeUndefined();
      });
    }
    finally {
      (Array.prototype as { findLast?: unknown }).findLast = native;
    }
  });
});
