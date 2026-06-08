import { computed, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { useCeil } from '.';

describe(useCeil, () => {
  it('rounds up a non-reactive value', () => {
    const ceiled = useCeil(0.95);

    expect(ceiled.value).toBe(1);
  });

  it('rounds up a ref value', () => {
    const value = ref(7.004);
    const ceiled = useCeil(value);

    expect(ceiled.value).toBe(8);
  });

  it('rounds up a getter value', () => {
    const ceiled = useCeil(() => 4.0001);

    expect(ceiled.value).toBe(5);
  });

  it('rounds up a computed value', () => {
    const value = computed(() => -0.5);
    const ceiled = useCeil(value);

    expect(ceiled.value).toBe(-0);
  });

  it('reacts to changes in the source ref', () => {
    const value = ref(1.2);
    const ceiled = useCeil(value);

    expect(ceiled.value).toBe(2);

    value.value = 9.9;
    expect(ceiled.value).toBe(10);

    value.value = -3.7;
    expect(ceiled.value).toBe(-3);
  });

  it('passes integers through unchanged', () => {
    expect(useCeil(5).value).toBe(5);
    expect(useCeil(-5).value).toBe(-5);
    expect(useCeil(0).value).toBe(0);
  });

  it('propagates non-finite inputs', () => {
    expect(useCeil(Infinity).value).toBe(Infinity);
    expect(useCeil(-Infinity).value).toBe(-Infinity);
    expect(useCeil(Number.NaN).value).toBeNaN();
  });
});
