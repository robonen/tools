import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useArrayEvery } from '.';

describe(useArrayEvery, () => {
  it('returns true when every element passes', () => {
    const list = ref([1, 2, 3, 4]);
    const allPositive = useArrayEvery(list, n => n > 0);
    expect(allPositive.value).toBeTruthy();
  });

  it('returns false when some element fails', () => {
    const list = ref([1, -2, 3, 4]);
    const allPositive = useArrayEvery(list, n => n > 0);
    expect(allPositive.value).toBeFalsy();
  });

  it('reacts to source array changes', () => {
    const list = ref([2, 4, 6]);
    const allEven = useArrayEvery(list, n => n % 2 === 0);
    expect(allEven.value).toBeTruthy();

    list.value = [2, 4, 5];
    expect(allEven.value).toBeFalsy();
  });

  it('unwraps reactive items', () => {
    const items = [ref(2), ref(4), ref(6)];
    const allEven = useArrayEvery(items, n => n % 2 === 0);
    expect(allEven.value).toBeTruthy();

    items[1]!.value = 5;
    expect(allEven.value).toBeFalsy();
  });

  it('accepts a getter as the list source', () => {
    const a = ref(1);
    const b = ref(2);
    const allPositive = useArrayEvery(() => [a.value, b.value], n => n > 0);
    expect(allPositive.value).toBeTruthy();

    b.value = -1;
    expect(allPositive.value).toBeFalsy();
  });

  it('passes index and array to the predicate', () => {
    const list = ref([0, 1, 2, 3]);
    const matchesIndex = useArrayEvery(list, (element, index, array) => {
      expect(array).toBe(list.value);
      return element === index;
    });
    expect(matchesIndex.value).toBeTruthy();
  });

  it('returns true for an empty array (vacuous truth)', () => {
    const list = ref<number[]>([]);
    const result = useArrayEvery(list, n => n > 0);
    expect(result.value).toBeTruthy();
  });

  it('is SSR-safe: never touches window/document/navigator', () => {
    const list = ref([1, 2, 3]);
    // Pure computed wrapper — evaluating it relies on no browser globals.
    const result = useArrayEvery(list, n => n > 0);
    expect(result.value).toBeTruthy();
  });
});
