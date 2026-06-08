import { computed, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { useMin } from '.';

describe(useMin, () => {
  it('returns the smallest of plain variadic values', () => {
    const min = useMin(3, 1, 2);

    expect(min.value).toBe(1);
  });

  it('returns the smallest of refs/getters/values', () => {
    const a = ref(2);
    const b = ref(5);
    const min = useMin(a, b, 10, () => -1);

    expect(min.value).toBe(-1);
  });

  it('reacts when a ref argument changes', () => {
    const a = ref(2);
    const b = ref(5);
    const min = useMin(a, b);

    expect(min.value).toBe(2);

    a.value = 8;

    expect(min.value).toBe(5);
  });

  it('accepts a single plain array', () => {
    const min = useMin([4, 2, 9]);

    expect(min.value).toBe(2);
  });

  it('accepts a reactive array whose items may be refs/getters', () => {
    const item = ref(5);
    const list = ref([10, item, () => 7]);
    const min = useMin(list);

    expect(min.value).toBe(5);

    item.value = 1;

    expect(min.value).toBe(1);
  });

  it('reacts when the reactive array reference changes', () => {
    const list = ref([4, 6]);
    const min = useMin(list);

    expect(min.value).toBe(4);

    list.value = [9, 3, 8];

    expect(min.value).toBe(3);
  });

  it('works with a getter that returns an array', () => {
    const a = ref(8);
    const min = useMin(() => [a.value, 3]);

    expect(min.value).toBe(3);

    a.value = 1;

    expect(min.value).toBe(1);
  });

  it('supports computed inputs', () => {
    const base = ref(10);
    const derived = computed(() => base.value * 2);
    const min = useMin(derived, 15);

    expect(min.value).toBe(15);

    base.value = 4;

    expect(min.value).toBe(8);
  });

  it('returns Infinity for an empty array (matching Math.min)', () => {
    const min = useMin([]);

    expect(min.value).toBe(Number.POSITIVE_INFINITY);
  });
});
