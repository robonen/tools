import { ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { usePrecision } from '.';

describe(usePrecision, () => {
  it('rounds to the requested number of digits by default', () => {
    const result = usePrecision(3.14159, 2);

    expect(result.value).toBe(3.14);
  });

  it('works with plain (non-reactive) inputs', () => {
    expect(usePrecision(1.2345, 0).value).toBe(1);
    expect(usePrecision(1.5, 0).value).toBe(2);
  });

  it('reacts when the source value changes', () => {
    const value = ref(3.14159);
    const result = usePrecision(value, 2);

    expect(result.value).toBe(3.14);

    value.value = 9.87654;

    expect(result.value).toBe(9.88);
  });

  it('reacts when the digits change', () => {
    const value = ref(3.14159);
    const digits = ref(2);
    const result = usePrecision(value, digits);

    expect(result.value).toBe(3.14);

    digits.value = 4;

    expect(result.value).toBe(3.1416);

    digits.value = 0;

    expect(result.value).toBe(3);
  });

  it('supports getter inputs', () => {
    const result = usePrecision(() => 3.14159, () => 3);

    expect(result.value).toBe(3.142);
  });

  it('applies the floor math option', () => {
    const result = usePrecision(3.14159, 2, { math: 'floor' });

    expect(result.value).toBe(3.14);
    expect(usePrecision(3.149, 2, { math: 'floor' }).value).toBe(3.14);
  });

  it('applies the ceil math option', () => {
    const result = usePrecision(3.14159, 2, { math: 'ceil' });

    expect(result.value).toBe(3.15);
    expect(usePrecision(3.141, 2, { math: 'ceil' }).value).toBe(3.15);
  });

  it('reacts when the options change', () => {
    const options = ref<{ math: 'floor' | 'ceil' | 'round' }>({ math: 'floor' });
    const result = usePrecision(3.149, 2, options);

    expect(result.value).toBe(3.14);

    options.value = { math: 'ceil' };

    expect(result.value).toBe(3.15);
  });

  it('supports getter options', () => {
    const result = usePrecision(3.149, 2, () => ({ math: 'ceil' }));

    expect(result.value).toBe(3.15);
  });

  it('handles negative numbers', () => {
    expect(usePrecision(-3.14159, 2).value).toBe(-3.14);
    expect(usePrecision(-3.149, 2, { math: 'floor' }).value).toBe(-3.15);
    expect(usePrecision(-3.141, 2, { math: 'ceil' }).value).toBe(-3.14);
  });

  it('corrects binary floating-point drift', () => {
    // 0.69 * 10 in raw float math is 6.8999999999999995 (would floor to 6.8 without correction)
    expect(usePrecision(0.69, 1).value).toBe(0.7);
    expect(usePrecision(0.615, 2).value).toBe(0.62);
    expect(usePrecision(1.255, 2).value).toBe(1.26);
  });

  it('handles negative digits (rounding to tens, hundreds, ...)', () => {
    expect(usePrecision(1234, -2).value).toBe(1200);
    expect(usePrecision(1280, -2, { math: 'ceil' }).value).toBe(1300);
  });

  it('leaves integers untouched', () => {
    expect(usePrecision(42, 2).value).toBe(42);
    expect(usePrecision(42, 0).value).toBe(42);
  });
});
