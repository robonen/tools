import { computed, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { useRound } from '.';

describe(useRound, () => {
  it('rounds a non-reactive value', () => {
    expect(useRound(0.6).value).toBe(1);
    expect(useRound(0.4).value).toBe(0);
    expect(useRound(-0.6).value).toBe(-1);
  });

  it('rounds a ref value', () => {
    const value = ref(1.49);
    const rounded = useRound(value);

    expect(rounded.value).toBe(1);
  });

  it('rounds a getter value', () => {
    const value = ref(2.5);
    const rounded = useRound(() => value.value);

    expect(rounded.value).toBe(3);
  });

  it('updates reactively when the source value changes', () => {
    const value = ref(1.2);
    const rounded = useRound(value);

    expect(rounded.value).toBe(1);

    value.value = 1.8;

    expect(rounded.value).toBe(2);
  });

  it('rounds a readonly computed source', () => {
    const source = computed(() => 4.7);
    const rounded = useRound(source);

    expect(rounded.value).toBe(5);
  });

  it('matches Math.round semantics for halves', () => {
    expect(useRound(0.5).value).toBe(1);
    expect(useRound(2.5).value).toBe(3);
    // Math.round(-0.5) === -0, which our composable preserves exactly.
    expect(useRound(-0.5).value).toBe(Math.round(-0.5));
    expect(useRound(-1.5).value).toBe(-1);
  });

  it('rounds to a fixed number of decimal places', () => {
    expect(useRound(1.2345, { digits: 2 }).value).toBe(1.23);
    expect(useRound(1.2355, { digits: 2 }).value).toBe(1.24);
    expect(useRound(1.005, { digits: 2 }).value).toBe(1.01);
  });

  it('rounds negative numbers with decimal precision', () => {
    expect(useRound(-1.2345, { digits: 2 }).value).toBe(-1.23);
    expect(useRound(-1.2355, { digits: 2 }).value).toBe(-1.24);
  });

  it('rounds to the left of the decimal point with negative digits', () => {
    expect(useRound(1234, { digits: -1 }).value).toBe(1230);
    expect(useRound(1250, { digits: -2 }).value).toBe(1300);
  });

  it('treats digits 0 as plain Math.round', () => {
    expect(useRound(1.6, { digits: 0 }).value).toBe(2);
  });

  it('reacts to a reactive digits option', () => {
    const value = ref(1.23456);
    const digits = ref(2);
    const rounded = useRound(value, { digits });

    expect(rounded.value).toBe(1.23);

    digits.value = 4;

    expect(rounded.value).toBe(1.2346);
  });

  it('accepts a getter for digits', () => {
    const digits = ref(1);
    const rounded = useRound(3.14159, { digits: () => digits.value });

    expect(rounded.value).toBe(3.1);
  });

  it('passes through non-finite values', () => {
    expect(useRound(Number.NaN).value).toBeNaN();
    expect(useRound(Number.POSITIVE_INFINITY).value).toBe(Number.POSITIVE_INFINITY);
    expect(useRound(Number.NEGATIVE_INFINITY, { digits: 2 }).value).toBe(Number.NEGATIVE_INFINITY);
    expect(useRound(Number.NaN, { digits: 2 }).value).toBeNaN();
  });

  it('works without any DOM globals (SSR-safe, pure computed)', () => {
    // The composable never touches window/document/navigator, so it must work
    // identically regardless of environment.
    const value = ref(9.99);
    const rounded = useRound(value, { digits: 1 });

    expect(rounded.value).toBe(10);
  });
});
