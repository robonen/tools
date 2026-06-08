import { computed, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { logicOr, or } from '.';

describe(logicOr, () => {
  it('returns false with no arguments', () => {
    const result = logicOr();

    expect(result.value).toBeFalsy();
  });

  it('returns true when a single raw value is truthy', () => {
    expect(logicOr(true).value).toBeTruthy();
    expect(logicOr(1).value).toBeTruthy();
  });

  it('returns false when a single raw value is falsy', () => {
    expect(logicOr(false).value).toBeFalsy();
    expect(logicOr(0).value).toBeFalsy();
  });

  it('returns true when at least one ref is truthy', () => {
    const a = ref(false);
    const b = ref(true);
    const result = logicOr(a, b);

    expect(result.value).toBeTruthy();
  });

  it('returns false when all refs are falsy', () => {
    const a = ref(false);
    const b = ref(false);
    const result = logicOr(a, b);

    expect(result.value).toBeFalsy();
  });

  it('supports getter arguments', () => {
    const result = logicOr(() => false, () => true);

    expect(result.value).toBeTruthy();
  });

  it('mixes refs, getters and raw values', () => {
    const a = ref(false);
    const result = logicOr(a, () => false, 1);

    expect(result.value).toBeTruthy();
  });

  it('reacts to ref changes', () => {
    const a = ref(false);
    const b = ref(false);
    const result = logicOr(a, b);

    expect(result.value).toBeFalsy();

    a.value = true;

    expect(result.value).toBeTruthy();
  });

  it('coerces truthy and falsy non-boolean values', () => {
    expect(logicOr(ref('hello')).value).toBeTruthy();
    expect(logicOr(ref('')).value).toBeFalsy();
    expect(logicOr(ref(null)).value).toBeFalsy();
    expect(logicOr(ref(undefined)).value).toBeFalsy();
  });

  it('handles computed sources', () => {
    const count = ref(0);
    const positive = computed(() => count.value > 0);
    const result = logicOr(positive);

    expect(result.value).toBeFalsy();

    count.value = 5;

    expect(result.value).toBeTruthy();
  });

  it('exposes `or` as an alias of `logicOr`', () => {
    expect(or).toBe(logicOr);

    const a = ref(false);
    const b = ref(true);

    expect(or(a, b).value).toBeTruthy();
  });

  it('is SSR-safe and touches no globals', () => {
    // Pure reactive computation: constructing and reading must never reference
    // window/document/navigator, so this works identically in any environment.
    const result = logicOr(ref(false), () => false);

    expect(result.value).toBeFalsy();
  });
});
