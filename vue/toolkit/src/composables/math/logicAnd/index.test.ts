import { computed, isReadonly, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { and, logicAnd } from '.';

describe(logicAnd, () => {
  it('returns true when every input is truthy', () => {
    expect(logicAnd(true, true, true).value).toBeTruthy();
    expect(logicAnd(ref(true), () => true, true).value).toBeTruthy();
  });

  it('returns false when any input is falsy', () => {
    expect(logicAnd(true, false, true).value).toBeFalsy();
    expect(logicAnd(ref(true), ref(false)).value).toBeFalsy();
  });

  it('returns true with no arguments (vacuous truth)', () => {
    expect(logicAnd().value).toBeTruthy();
  });

  it('reacts to ref changes', () => {
    const a = ref(true);
    const b = ref(true);
    const result = logicAnd(a, b);

    expect(result.value).toBeTruthy();

    b.value = false;
    expect(result.value).toBeFalsy();

    b.value = true;
    a.value = false;
    expect(result.value).toBeFalsy();
  });

  it('supports getters', () => {
    const flag = ref(true);
    const result = logicAnd(() => flag.value, () => true);

    expect(result.value).toBeTruthy();

    flag.value = false;
    expect(result.value).toBeFalsy();
  });

  it('works with computed inputs', () => {
    const count = ref(2);
    const positive = computed(() => count.value > 0);
    const even = computed(() => count.value % 2 === 0);
    const result = logicAnd(positive, even);

    expect(result.value).toBeTruthy();

    count.value = 3;
    expect(result.value).toBeFalsy();

    count.value = -4;
    expect(result.value).toBeFalsy();
  });

  it('coerces non-boolean truthy and falsy values to a strict boolean result', () => {
    const truthy = logicAnd(1, 'a', {});
    const falsy = logicAnd(1, 0);

    // The composable normalises to a real boolean rather than passing the
    // raw value through, so assert on the exact value and its type.
    expect(truthy.value).toBeTruthy();
    expect(typeof truthy.value).toBe('boolean');
    expect(falsy.value).toBeFalsy();
    expect(typeof falsy.value).toBe('boolean');

    expect(logicAnd('text', '').value).toBeFalsy();
    expect(logicAnd(1, null).value).toBeFalsy();
    expect(logicAnd(1, undefined).value).toBeFalsy();
  });

  it('returns a readonly computed', () => {
    const result = logicAnd(ref(true));

    expect(isReadonly(result)).toBeTruthy();
  });

  it('exposes `and` as an alias of `logicAnd`', () => {
    expect(and).toBe(logicAnd);
    expect(and(ref(true), () => true).value).toBeTruthy();
    expect(and(ref(true), ref(false)).value).toBeFalsy();
  });
});
