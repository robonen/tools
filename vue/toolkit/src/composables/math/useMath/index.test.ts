import { computed, effectScope, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { useMath } from '.';

describe(useMath, () => {
  it('computes a unary method from plain values', () => {
    const result = useMath('abs', -5);

    expect(result.value).toBe(5);
  });

  it('computes a binary method from refs', () => {
    const a = ref(2);
    const b = ref(8);
    const result = useMath('max', a, b);

    expect(result.value).toBe(8);
  });

  it('accepts getters as arguments', () => {
    const value = ref(-4.7);
    const result = useMath('round', () => value.value);

    expect(result.value).toBe(-5);
  });

  it('mixes plain values, refs and getters', () => {
    const a = ref(3);
    const result = useMath('max', a, 4, () => 1);

    expect(result.value).toBe(4);
  });

  it('handles variadic methods such as hypot', () => {
    const x = ref(3);
    const y = ref(4);
    const result = useMath('hypot', x, y);

    expect(result.value).toBe(5);
  });

  it('recomputes when a ref argument changes', () => {
    const a = ref(2);
    const b = ref(8);
    const result = useMath('max', a, b);

    expect(result.value).toBe(8);

    a.value = 20;

    expect(result.value).toBe(20);

    b.value = 100;

    expect(result.value).toBe(100);
  });

  it('recomputes when a getter dependency changes', () => {
    const value = ref(1.4);
    const result = useMath('round', () => value.value);

    expect(result.value).toBe(1);

    value.value = 1.6;

    expect(result.value).toBe(2);
  });

  it('works with readonly computed inputs', () => {
    const value = computed(() => 2);
    const result = useMath('pow', value, 3);

    expect(result.value).toBe(8);
  });

  it('returns a lazily evaluated computed ref', () => {
    const spy = vi.spyOn(Math, 'sqrt');
    const value = ref(16);
    const result = useMath('sqrt', value);

    // computed is lazy: not evaluated until first read
    expect(spy).not.toHaveBeenCalled();

    expect(result.value).toBe(4);
    expect(spy).toHaveBeenCalledTimes(1);

    // repeated reads without dependency change are cached
    void result.value;
    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });

  it('is SSR-safe (no global access; works inside a detached scope)', () => {
    const scope = effectScope();
    let result: ReturnType<typeof useMath<'min'>> | undefined;

    scope.run(() => {
      result = useMath('min', () => 10, () => 3, () => 7);
    });

    expect(result?.value).toBe(3);

    scope.stop();
  });

  it('produces NaN for invalid input without throwing', () => {
    const value = ref(-1);
    const result = useMath('sqrt', value);

    expect(Number.isNaN(result.value)).toBeTruthy();
  });
});
