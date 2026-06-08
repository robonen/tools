import { computed, isReadonly, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { logicNot, not } from '.';

describe(logicNot, () => {
  it('returns the negation of a truthy input', () => {
    expect(logicNot(true).value).toBeFalsy();
    expect(logicNot(ref(true)).value).toBeFalsy();
    expect(logicNot(() => true).value).toBeFalsy();
  });

  it('returns the negation of a falsy input', () => {
    expect(logicNot(false).value).toBeTruthy();
    expect(logicNot(ref(false)).value).toBeTruthy();
    expect(logicNot(() => false).value).toBeTruthy();
  });

  it('reacts to ref changes', () => {
    const a = ref(true);
    const result = logicNot(a);

    expect(result.value).toBeFalsy();

    a.value = false;
    expect(result.value).toBeTruthy();

    a.value = true;
    expect(result.value).toBeFalsy();
  });

  it('supports getters', () => {
    const flag = ref(false);
    const result = logicNot(() => flag.value);

    expect(result.value).toBeTruthy();

    flag.value = true;
    expect(result.value).toBeFalsy();
  });

  it('works with computed inputs', () => {
    const count = ref(0);
    const positive = computed(() => count.value > 0);
    const result = logicNot(positive);

    expect(result.value).toBeTruthy();

    count.value = 5;
    expect(result.value).toBeFalsy();

    count.value = -1;
    expect(result.value).toBeTruthy();
  });

  it('coerces non-boolean values to a boolean result', () => {
    expect(logicNot(1).value).toBeFalsy();
    expect(logicNot('text').value).toBeFalsy();
    expect(logicNot({}).value).toBeFalsy();
    expect(logicNot(0).value).toBeTruthy();
    expect(logicNot('').value).toBeTruthy();
    expect(logicNot(null).value).toBeTruthy();
    expect(logicNot(undefined).value).toBeTruthy();
  });

  it('returns a readonly computed', () => {
    const result = logicNot(ref(true));

    expect(isReadonly(result)).toBeTruthy();
  });

  it('exposes `not` as an alias of `logicNot`', () => {
    expect(not).toBe(logicNot);
    expect(not(ref(true)).value).toBeFalsy();
    expect(not(() => false).value).toBeTruthy();
  });
});
