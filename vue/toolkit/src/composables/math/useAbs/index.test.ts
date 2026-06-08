import { computed, isReadonly, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { useAbs } from '.';

describe(useAbs, () => {
  it('returns the absolute value of a static number', () => {
    expect(useAbs(-42).value).toBe(42);
    expect(useAbs(42).value).toBe(42);
    expect(useAbs(0).value).toBe(0);
  });

  it('returns the absolute value of a ref', () => {
    const value = ref(-10);
    const abs = useAbs(value);

    expect(abs.value).toBe(10);
  });

  it('reacts to ref changes', () => {
    const value = ref(-10);
    const abs = useAbs(value);

    expect(abs.value).toBe(10);

    value.value = 5;
    expect(abs.value).toBe(5);

    value.value = -3;
    expect(abs.value).toBe(3);
  });

  it('supports getters', () => {
    const value = ref(-7);
    const abs = useAbs(() => value.value);

    expect(abs.value).toBe(7);

    value.value = -100;
    expect(abs.value).toBe(100);
  });

  it('handles negative zero, infinity and NaN like Math.abs', () => {
    expect(useAbs(-0).value).toBe(0);
    expect(useAbs(Number.NEGATIVE_INFINITY).value).toBe(Number.POSITIVE_INFINITY);
    expect(useAbs(Number.NaN).value).toBeNaN();
  });

  it('returns a readonly computed', () => {
    const abs = useAbs(ref(-1));

    expect(isReadonly(abs)).toBeTruthy();
  });

  it('works with computed inputs', () => {
    const value = ref(-4);
    const doubled = computed(() => value.value * 2);
    const abs = useAbs(doubled);

    expect(abs.value).toBe(8);

    value.value = 3;
    expect(abs.value).toBe(6);
  });
});
