import { computed, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { useFloor } from '.';

describe(useFloor, () => {
  it('floors a non-reactive value', () => {
    const floored = useFloor(5.95);

    expect(floored.value).toBe(5);
  });

  it('floors a reactive ref value', () => {
    const value = ref(5.05);
    const floored = useFloor(value);

    expect(floored.value).toBe(5);
  });

  it('floors a getter value', () => {
    const floored = useFloor(() => 5.5);

    expect(floored.value).toBe(5);
  });

  it('updates when the source ref changes', () => {
    const value = ref(5.95);
    const floored = useFloor(value);

    expect(floored.value).toBe(5);

    value.value = 8.1;

    expect(floored.value).toBe(8);
  });

  it('floors negative values toward negative infinity', () => {
    expect(useFloor(-5.05).value).toBe(-6);
    expect(useFloor(-0.5).value).toBe(-1);
  });

  it('returns integers unchanged', () => {
    expect(useFloor(42).value).toBe(42);
    expect(useFloor(0).value).toBe(0);
  });

  it('works with a computed source', () => {
    const value = ref(2);
    const source = computed(() => value.value + 0.9);
    const floored = useFloor(source);

    expect(floored.value).toBe(2);

    value.value = 5;

    expect(floored.value).toBe(5);
  });

  it('propagates special numeric values', () => {
    expect(useFloor(Number.NaN).value).toBeNaN();
    expect(useFloor(Infinity).value).toBe(Infinity);
    expect(useFloor(-Infinity).value).toBe(-Infinity);
  });
});
