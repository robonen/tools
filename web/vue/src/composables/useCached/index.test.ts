import { describe, expect, it } from 'vitest';
import { ref, nextTick, reactive } from 'vue';
import { useCached } from '.';

const arrayEquals = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);

describe('useCached', () => {
  it('default comparator', async () => {
    const externalValue = ref(0);
    const cachedValue = useCached(externalValue);

    expect(cachedValue.value).toBe(0);

    externalValue.value = 1;
    await nextTick();
    expect(cachedValue.value).toBe(1);
  });

  it('custom array comparator', async () => {
    const externalValue = ref([1]);
    const initialValue = externalValue.value;

    const cachedValue = useCached(externalValue, arrayEquals);

    expect(cachedValue.value).toEqual(initialValue);

    externalValue.value = initialValue;
    await nextTick();
    expect(cachedValue.value).toEqual(initialValue);

    externalValue.value = [1];
    await nextTick();
    expect(cachedValue.value).toEqual(initialValue);

    externalValue.value = [2];
    await nextTick();
    expect(cachedValue.value).not.toEqual(initialValue);
    expect(cachedValue.value).toEqual([2]);
  });

  it('getter source', async () => {
    const externalValue = reactive({ value: 0 });
    const cachedValue = useCached(() => externalValue.value);

    expect(cachedValue.value).toBe(0);

    externalValue.value = 1;
    await nextTick();
    expect(cachedValue.value).toBe(1);
  });
});