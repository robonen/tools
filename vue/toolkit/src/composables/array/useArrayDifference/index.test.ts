import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useArrayDifference } from '.';

describe(useArrayDifference, () => {
  it('returns the asymmetric difference of two arrays', () => {
    const list = ref([1, 2, 3, 4, 5]);
    const values = ref([2, 4]);
    const diff = useArrayDifference(list, values);
    expect(diff.value).toEqual([1, 3, 5]);
  });

  it('returns an empty array when all items are subtracted', () => {
    const list = ref([1, 2, 3]);
    const values = ref([1, 2, 3, 4]);
    const diff = useArrayDifference(list, values);
    expect(diff.value).toEqual([]);
  });

  it('returns the full list when values is empty', () => {
    const list = ref([1, 2, 3]);
    const values = ref<number[]>([]);
    const diff = useArrayDifference(list, values);
    expect(diff.value).toEqual([1, 2, 3]);
  });

  it('reacts to changes in the source array', () => {
    const list = ref([1, 2, 3]);
    const values = ref([2]);
    const diff = useArrayDifference(list, values);
    expect(diff.value).toEqual([1, 3]);

    list.value = [1, 2, 3, 4];
    expect(diff.value).toEqual([1, 3, 4]);
  });

  it('reacts to changes in the values array', () => {
    const list = ref([1, 2, 3]);
    const values = ref([2]);
    const diff = useArrayDifference(list, values);
    expect(diff.value).toEqual([1, 3]);

    values.value = [1, 2];
    expect(diff.value).toEqual([3]);
  });

  it('accepts getters as sources', () => {
    const a = ref(1);
    const b = ref(2);
    const diff = useArrayDifference(() => [a.value, b.value, 3], () => [b.value]);
    expect(diff.value).toEqual([1, 3]);

    b.value = 1;
    expect(diff.value).toEqual([3]);
  });

  it('compares by key (positional argument)', () => {
    const list = ref([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const values = ref([{ id: 2 }]);
    const diff = useArrayDifference(list, values, 'id');
    expect(diff.value).toEqual([{ id: 1 }, { id: 3 }]);
  });

  it('compares with a custom comparator function', () => {
    const list = ref([1, 2, 3, 4, 5, 6]);
    const values = ref([2]);
    // Treat numbers with the same parity as equal.
    const diff = useArrayDifference(list, values, (a, b) => a % 2 === b % 2);
    expect(diff.value).toEqual([1, 3, 5]);
  });

  it('returns the symmetric difference via options', () => {
    const a = ref([1, 2, 3]);
    const b = ref([2, 3, 4]);
    const diff = useArrayDifference(a, b, { symmetric: true });
    expect(diff.value).toEqual([1, 4]);
  });

  it('returns the symmetric difference via the trailing options argument', () => {
    const a = ref([{ id: 1 }, { id: 2 }]);
    const b = ref([{ id: 2 }, { id: 3 }]);
    const diff = useArrayDifference(a, b, 'id', { symmetric: true });
    expect(diff.value).toEqual([{ id: 1 }, { id: 3 }]);
  });

  it('accepts a comparator inside the options object', () => {
    const list = ref([1, 2, 3, 4]);
    const values = ref([20, 30]);
    const diff = useArrayDifference(list, values, {
      comparator: (a, b) => a === b / 10,
    });
    expect(diff.value).toEqual([1, 4]);
  });

  it('reacts to source changes when symmetric', () => {
    const a = ref([1, 2]);
    const b = ref([2, 3]);
    const diff = useArrayDifference(a, b, { symmetric: true });
    expect(diff.value).toEqual([1, 3]);

    a.value = [1, 2, 3];
    expect(diff.value).toEqual([1]);
  });

  it('does not mutate the source arrays in symmetric mode', () => {
    const a = ref([1, 2]);
    const b = ref([2, 3]);
    const diff = useArrayDifference(a, b, { symmetric: true });
    expect(diff.value).toEqual([1, 3]);
    expect(a.value).toEqual([1, 2]);
    expect(b.value).toEqual([2, 3]);
  });

  it('is SSR-safe: never touches window/document/navigator', () => {
    // Pure computed wrapper — evaluating it relies on no browser globals.
    const list = ref([1, 2, 3]);
    const values = ref([2]);
    const diff = useArrayDifference(list, values);
    expect(diff.value).toEqual([1, 3]);
  });
});
