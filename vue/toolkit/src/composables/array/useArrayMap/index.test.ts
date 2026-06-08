import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useArrayMap } from '.';

describe(useArrayMap, () => {
  it('maps reactively', () => {
    const list = ref([1, 2, 3]);
    const doubled = useArrayMap(list, n => n * 2);
    expect(doubled.value).toEqual([2, 4, 6]);

    list.value = [4, 5];
    expect(doubled.value).toEqual([8, 10]);
  });

  it('unwraps reactive items', () => {
    const list = [ref(1), ref(2)];
    const mapped = useArrayMap(list, n => n + 1);
    expect(mapped.value).toEqual([2, 3]);
  });
});
