import { ref, readonly, computed } from 'vue';
import { describe, it, expect } from 'vitest';
import { useClamp } from '.';

describe('useClamp', () => {
  it('non-reactive values should be clamped', () => {
    const clampedValue = useClamp(10, 0, 5);

    expect(clampedValue.value).toBe(5);
  });

  it('clamp the value within the given range', () => {
    const value = ref(10);
    const clampedValue = useClamp(value, 0, 5);

    expect(clampedValue.value).toBe(5);
  });

  it('clamp the value within the given range using functions', () => {
    const value = ref(10);
    const clampedValue = useClamp(value, () => 0, () => 5);

    expect(clampedValue.value).toBe(5);
  });

  it('clamp readonly values', () => {
    const computedValue = computed(() => 10);
    const readonlyValue = readonly(ref(10));
    const clampedValue1 = useClamp(computedValue, 0, 5);
    const clampedValue2 = useClamp(readonlyValue, 0, 5);

    expect(clampedValue1.value).toBe(5);
    expect(clampedValue2.value).toBe(5);
  });

  it('update the clamped value when the original value changes', () => {
    const value = ref(10);
    const clampedValue = useClamp(value, 0, 5);
    value.value = 3;

    expect(clampedValue.value).toBe(3);
  });

  it('update the clamped value when the min or max changes', () => {
    const value = ref(10);
    const min = ref(0);
    const max = ref(5);
    const clampedValue = useClamp(value, min, max);

    expect(clampedValue.value).toBe(5);

    max.value = 15;

    expect(clampedValue.value).toBe(10);

    min.value = 11;

    expect(clampedValue.value).toBe(11);
  });
});