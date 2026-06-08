import { describe, expect, it } from 'vitest';
import { computed, ref, shallowRef } from 'vue';
import { isDefined, useIsDefined } from '.';

describe(isDefined, () => {
  it('returns true for a ref holding a defined value', () => {
    expect(isDefined(ref(0))).toBeTruthy();
    expect(isDefined(ref(''))).toBeTruthy();
    expect(isDefined(ref(false))).toBeTruthy();
    expect(isDefined(ref({}))).toBeTruthy();
  });

  it('returns false for a ref holding null or undefined', () => {
    expect(isDefined(ref(null))).toBeFalsy();
    expect(isDefined(ref(undefined))).toBeFalsy();
  });

  it('treats null and undefined as equivalently undefined', () => {
    const value = ref<number | null | undefined>(undefined);
    expect(isDefined(value)).toBeFalsy();
    value.value = null;
    expect(isDefined(value)).toBeFalsy();
    value.value = 0;
    expect(isDefined(value)).toBeTruthy();
  });

  it('works with plain (non-ref) values', () => {
    expect(isDefined(42)).toBeTruthy();
    expect(isDefined('')).toBeTruthy();
    expect(isDefined(null)).toBeFalsy();
    expect(isDefined(undefined)).toBeFalsy();
  });

  it('works with computed refs', () => {
    const source = ref<number | null>(null);
    const derived = computed(() => source.value);
    expect(isDefined(derived)).toBeFalsy();
    source.value = 5;
    expect(isDefined(derived)).toBeTruthy();
  });

  it('works with shallowRef', () => {
    expect(isDefined(shallowRef(null))).toBeFalsy();
    expect(isDefined(shallowRef('x'))).toBeTruthy();
  });

  it('narrows the type for guarded access (compile-time check)', () => {
    const maybe = ref<{ name: string } | null>(null);
    let name = 'fallback';
    if (isDefined(maybe))
      name = maybe.value.name;
    expect(name).toBe('fallback');
    maybe.value = { name: 'robonen' };
    if (isDefined(maybe))
      name = maybe.value.name;
    expect(name).toBe('robonen');
  });
});

describe(useIsDefined, () => {
  it('returns a computed boolean reflecting the current value', () => {
    const source = ref<number | null>(1);
    const defined = useIsDefined(source);
    expect(defined.value).toBeTruthy();
  });

  it('reacts to source changes', () => {
    const source = ref<number | null>(null);
    const defined = useIsDefined(source);
    expect(defined.value).toBeFalsy();
    source.value = 0;
    expect(defined.value).toBeTruthy();
    source.value = null;
    expect(defined.value).toBeFalsy();
  });

  it('accepts a getter source', () => {
    const source = ref<string | undefined>(undefined);
    const defined = useIsDefined(() => source.value);
    expect(defined.value).toBeFalsy();
    source.value = 'ready';
    expect(defined.value).toBeTruthy();
  });

  it('accepts a plain value source', () => {
    expect(useIsDefined(123).value).toBeTruthy();
    expect(useIsDefined(null).value).toBeFalsy();
    expect(useIsDefined(undefined).value).toBeFalsy();
  });

  it('treats falsy-but-defined values as defined', () => {
    expect(useIsDefined(0).value).toBeTruthy();
    expect(useIsDefined('').value).toBeTruthy();
    expect(useIsDefined(false).value).toBeTruthy();
  });
});
