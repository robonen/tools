import { computed, readonly, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { useMax } from '.';

describe(useMax, () => {
  it('returns the maximum of raw variadic values', () => {
    const max = useMax(1, 3, 2);

    expect(max.value).toBe(3);
  });

  it('returns the maximum of ref variadic values', () => {
    const a = ref(1);
    const b = ref(3);
    const c = ref(2);
    const max = useMax(a, b, c);

    expect(max.value).toBe(3);
  });

  it('supports getter arguments', () => {
    const max = useMax(() => 4, () => 9, () => 1);

    expect(max.value).toBe(9);
  });

  it('mixes refs, getters and raw values', () => {
    const a = ref(5);
    const max = useMax(a, () => 8, 2);

    expect(max.value).toBe(8);
  });

  it('reacts to ref changes', () => {
    const a = ref(1);
    const b = ref(3);
    const max = useMax(a, b);

    expect(max.value).toBe(3);

    a.value = 10;

    expect(max.value).toBe(10);
  });

  it('returns the maximum of a reactive array', () => {
    const list = ref([1, 5, 2]);
    const max = useMax(list);

    expect(max.value).toBe(5);

    list.value = [7, 3, 4];

    expect(max.value).toBe(7);
  });

  it('returns the maximum of a getter array', () => {
    const max = useMax(() => [1, 9, 4]);

    expect(max.value).toBe(9);
  });

  it('unwraps refs and getters nested inside the array', () => {
    const list = ref<Array<number | (() => number)>>([ref(1) as unknown as number, () => 5, 2]);
    // The array items are refs/getters; useMax should unwrap them.
    const a = ref(1);
    const max = useMax(ref([a, () => 5, 2]));

    expect(max.value).toBe(5);

    a.value = 99;

    expect(max.value).toBe(99);
    void list;
  });

  it('reacts when a mutated plain array ref is reassigned', () => {
    const list = ref([1, 2, 3]);
    const max = useMax(list);

    expect(max.value).toBe(3);

    list.value = [...list.value, 100];

    expect(max.value).toBe(100);
  });

  it('handles readonly and computed sources', () => {
    const computedValue = computed(() => 12);
    const readonlyValue = readonly(ref(7));
    const max = useMax(computedValue, readonlyValue, 3);

    expect(max.value).toBe(12);
  });

  it('handles negative values', () => {
    const max = useMax(-5, -1, -10);

    expect(max.value).toBe(-1);
  });

  it('returns -Infinity for an empty array (SSR-safe, no globals touched)', () => {
    const max = useMax(ref<number[]>([]));

    expect(max.value).toBe(Number.NEGATIVE_INFINITY);
  });

  it('returns a single value when only one argument is given', () => {
    const max = useMax(42);

    expect(max.value).toBe(42);
  });
});
