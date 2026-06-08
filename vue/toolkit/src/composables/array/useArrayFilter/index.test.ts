import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useArrayFilter } from '.';

describe(useArrayFilter, () => {
  it('filters reactively', () => {
    const list = ref([1, 2, 3, 4]);
    const even = useArrayFilter(list, n => n % 2 === 0);
    expect(even.value).toEqual([2, 4]);

    list.value = [1, 3, 5, 6];
    expect(even.value).toEqual([6]);
  });

  it('unwraps reactive items', () => {
    const list = [ref(1), ref(2), ref(3)];
    const odd = useArrayFilter(list, n => n % 2 === 1);
    expect(odd.value).toEqual([1, 3]);
  });
});
