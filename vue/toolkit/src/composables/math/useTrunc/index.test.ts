import { computed, readonly, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { useTrunc } from '.';

describe(useTrunc, () => {
  it('truncate a non-reactive value', () => {
    const truncated = useTrunc(2.9);

    expect(truncated.value).toBe(2);
  });

  it('truncate negative values toward zero', () => {
    expect(useTrunc(-3.7).value).toBe(-3);
    expect(useTrunc(-0.4).value).toBe(-0);
  });

  it('leave integers unchanged', () => {
    expect(useTrunc(5).value).toBe(5);
    expect(useTrunc(-5).value).toBe(-5);
    expect(useTrunc(0).value).toBe(0);
  });

  it('truncate a reactive ref', () => {
    const value = ref(2.9);
    const truncated = useTrunc(value);

    expect(truncated.value).toBe(2);
  });

  it('truncate using a getter', () => {
    const truncated = useTrunc(() => 4.999);

    expect(truncated.value).toBe(4);
  });

  it('truncate readonly values', () => {
    const computedValue = computed(() => 7.5);
    const readonlyValue = readonly(ref(7.5));

    expect(useTrunc(computedValue).value).toBe(7);
    expect(useTrunc(readonlyValue).value).toBe(7);
  });

  it('update the truncated value when the original value changes', () => {
    const value = ref(2.9);
    const truncated = useTrunc(value);

    expect(truncated.value).toBe(2);

    value.value = 9.99;

    expect(truncated.value).toBe(9);

    value.value = -1.5;

    expect(truncated.value).toBe(-1);
  });

  it('propagate non-finite inputs', () => {
    expect(useTrunc(Number.POSITIVE_INFINITY).value).toBe(Number.POSITIVE_INFINITY);
    expect(useTrunc(Number.NEGATIVE_INFINITY).value).toBe(Number.NEGATIVE_INFINITY);
    expect(useTrunc(Number.NaN).value).toBeNaN();
  });
});
