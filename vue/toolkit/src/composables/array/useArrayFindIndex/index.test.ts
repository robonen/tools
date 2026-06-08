import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useArrayFindIndex } from '.';

describe(useArrayFindIndex, () => {
  it('finds the index reactively', () => {
    const list = ref([1, 2, 3]);
    const index = useArrayFindIndex(list, n => n > 1);
    expect(index.value).toBe(1);

    list.value = [10, 20];
    expect(index.value).toBe(0);
  });

  it('returns -1 when nothing matches', () => {
    const index = useArrayFindIndex(ref([1, 2]), n => n > 5);
    expect(index.value).toBe(-1);
  });

  it('returns -1 for an empty array', () => {
    const index = useArrayFindIndex(ref<number[]>([]), () => true);
    expect(index.value).toBe(-1);
  });

  it('passes element, index and the resolved array to the predicate', () => {
    const calls: Array<[number, number, number[]]> = [];
    const index = useArrayFindIndex(ref([5, 6, 7]), (element, idx, array) => {
      calls.push([element, idx, array]);
      return element === 7;
    });

    expect(index.value).toBe(2);
    expect(calls).toEqual([
      [5, 0, [5, 6, 7]],
      [6, 1, [5, 6, 7]],
      [7, 2, [5, 6, 7]],
    ]);
  });

  it('unwraps reactive items inside the list', () => {
    const a = ref(1);
    const b = ref(2);
    const index = useArrayFindIndex([a, b], n => n === 2);
    expect(index.value).toBe(1);

    b.value = 0;
    a.value = 0;
    expect(index.value).toBe(-1);
  });

  it('accepts a getter as the source list', () => {
    const source = ref([3, 4, 5]);
    const index = useArrayFindIndex(() => source.value, n => n % 2 === 0);
    expect(index.value).toBe(1);

    source.value = [1, 3, 5];
    expect(index.value).toBe(-1);
  });

  it('accepts a plain (non-reactive) array', () => {
    const index = useArrayFindIndex([10, 20, 30], n => n === 30);
    expect(index.value).toBe(2);
  });

  it('returns the FIRST matching index', () => {
    const index = useArrayFindIndex(ref([2, 4, 6, 8]), n => n % 2 === 0);
    expect(index.value).toBe(0);
  });
});
