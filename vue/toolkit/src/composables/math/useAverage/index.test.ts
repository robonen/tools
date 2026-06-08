import { computed, readonly, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { useAverage } from '.';

describe(useAverage, () => {
  it('returns the average of raw variadic values', () => {
    const avg = useAverage(1, 3, 2);

    expect(avg.value).toBe(2);
  });

  it('returns the average of ref variadic values', () => {
    const a = ref(2);
    const b = ref(4);
    const c = ref(6);
    const avg = useAverage(a, b, c);

    expect(avg.value).toBe(4);
  });

  it('supports getter arguments', () => {
    const avg = useAverage(() => 4, () => 8, () => 0);

    expect(avg.value).toBe(4);
  });

  it('mixes refs, getters and raw values', () => {
    const a = ref(5);
    const avg = useAverage(a, () => 7, 3);

    expect(avg.value).toBe(5);
  });

  it('reacts to ref changes', () => {
    const a = ref(2);
    const b = ref(4);
    const avg = useAverage(a, b);

    expect(avg.value).toBe(3);

    a.value = 10;

    expect(avg.value).toBe(7);
  });

  it('returns the average of a reactive array', () => {
    const list = ref([1, 5, 3]);
    const avg = useAverage(list);

    expect(avg.value).toBe(3);

    list.value = [2, 4, 6];

    expect(avg.value).toBe(4);
  });

  it('returns the average of a getter array', () => {
    const avg = useAverage(() => [1, 2, 3, 4]);

    expect(avg.value).toBe(2.5);
  });

  it('unwraps refs and getters nested inside the array', () => {
    const a = ref(2);
    const avg = useAverage(ref([a, () => 4, 6]));

    expect(avg.value).toBe(4);

    a.value = 8;

    expect(avg.value).toBe(6);
  });

  it('reacts when a mutated plain array ref is reassigned', () => {
    const list = ref([1, 2, 3]);
    const avg = useAverage(list);

    expect(avg.value).toBe(2);

    list.value = [...list.value, 6];

    expect(avg.value).toBe(3);
  });

  it('handles readonly and computed sources', () => {
    const computedValue = computed(() => 12);
    const readonlyValue = readonly(ref(6));
    const avg = useAverage(computedValue, readonlyValue, 3);

    expect(avg.value).toBe(7);
  });

  it('handles negative values', () => {
    const avg = useAverage(-4, -2, -6);

    expect(avg.value).toBe(-4);
  });

  it('returns NaN for an empty array (SSR-safe, no globals touched)', () => {
    const avg = useAverage(ref<number[]>([]));

    expect(avg.value).toBeNaN();
  });

  it('returns the single value when only one argument is given', () => {
    const avg = useAverage(42);

    expect(avg.value).toBe(42);
  });

  it('returns the mean of a single-element array', () => {
    const avg = useAverage(ref([9]));

    expect(avg.value).toBe(9);
  });
});
