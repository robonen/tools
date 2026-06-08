import { computed, readonly, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { useSum } from '.';

describe(useSum, () => {
  it('returns the sum of raw variadic values', () => {
    const total = useSum(1, 3, 2);

    expect(total.value).toBe(6);
  });

  it('returns the sum of ref variadic values', () => {
    const a = ref(1);
    const b = ref(3);
    const c = ref(2);
    const total = useSum(a, b, c);

    expect(total.value).toBe(6);
  });

  it('supports getter arguments', () => {
    const total = useSum(() => 4, () => 9, () => 1);

    expect(total.value).toBe(14);
  });

  it('mixes refs, getters and raw values', () => {
    const a = ref(5);
    const total = useSum(a, () => 8, 2);

    expect(total.value).toBe(15);
  });

  it('reacts to ref changes', () => {
    const a = ref(1);
    const b = ref(3);
    const total = useSum(a, b);

    expect(total.value).toBe(4);

    a.value = 10;

    expect(total.value).toBe(13);
  });

  it('returns the sum of a reactive array', () => {
    const list = ref([1, 5, 2]);
    const total = useSum(list);

    expect(total.value).toBe(8);

    list.value = [7, 3, 4];

    expect(total.value).toBe(14);
  });

  it('returns the sum of a getter array', () => {
    const total = useSum(() => [1, 9, 4]);

    expect(total.value).toBe(14);
  });

  it('unwraps refs and getters nested inside the array', () => {
    const a = ref(1);
    const total = useSum(ref([a, () => 5, 2]));

    expect(total.value).toBe(8);

    a.value = 99;

    expect(total.value).toBe(106);
  });

  it('reacts when a mutated plain array ref is reassigned', () => {
    const list = ref([1, 2, 3]);
    const total = useSum(list);

    expect(total.value).toBe(6);

    list.value = [...list.value, 100];

    expect(total.value).toBe(106);
  });

  it('handles readonly and computed sources', () => {
    const computedValue = computed(() => 12);
    const readonlyValue = readonly(ref(7));
    const total = useSum(computedValue, readonlyValue, 3);

    expect(total.value).toBe(22);
  });

  it('handles negative values', () => {
    const total = useSum(-5, -1, -10);

    expect(total.value).toBe(-16);
  });

  it('returns 0 for an empty array (SSR-safe, no globals touched)', () => {
    const total = useSum(ref<number[]>([]));

    expect(total.value).toBe(0);
  });

  it('returns 0 when called with no arguments', () => {
    const total = useSum();

    expect(total.value).toBe(0);
  });

  it('returns a single value when only one argument is given', () => {
    const total = useSum(42);

    expect(total.value).toBe(42);
  });
});
