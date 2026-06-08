import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useArrayFind } from '.';

describe(useArrayFind, () => {
  it('finds reactively', () => {
    const list = ref([1, 2, 3]);
    const found = useArrayFind(list, n => n > 1);
    expect(found.value).toBe(2);

    list.value = [10, 20];
    expect(found.value).toBe(10);
  });

  it('returns undefined when nothing matches', () => {
    const found = useArrayFind(ref([1, 2]), n => n > 5);
    expect(found.value).toBeUndefined();
  });
});
