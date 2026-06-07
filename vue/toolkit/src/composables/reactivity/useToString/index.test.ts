import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useToString } from '.';

describe(useToString, () => {
  it('stringifies a number ref', () => {
    const num = ref(42);
    const str = useToString(num);
    expect(str.value).toBe('42');
  });

  it('reacts to source changes', () => {
    const num = ref(1);
    const str = useToString(num);
    expect(str.value).toBe('1');
    num.value = 2;
    expect(str.value).toBe('2');
  });

  it('stringifies a plain (non-reactive) value', () => {
    expect(useToString(10).value).toBe('10');
    expect(useToString('hello').value).toBe('hello');
  });

  it('stringifies booleans', () => {
    expect(useToString(true).value).toBe('true');
    expect(useToString(false).value).toBe('false');
  });

  it('stringifies null and undefined like String()', () => {
    expect(useToString(null).value).toBe('null');
    expect(useToString(undefined).value).toBe('undefined');
  });

  it('passes through string sources unchanged', () => {
    const src = ref('already a string');
    expect(useToString(src).value).toBe('already a string');
  });

  it('stringifies objects via their toString', () => {
    expect(useToString({}).value).toBe('[object Object]');
    expect(useToString([1, 2, 3]).value).toBe('1,2,3');
  });

  it('honors a custom toString on objects', () => {
    const obj = { toString: () => 'custom' };
    expect(useToString(obj).value).toBe('custom');
  });

  it('supports getter sources', () => {
    const base = ref(2);
    const str = useToString(() => `item-${base.value}`);
    expect(str.value).toBe('item-2');
    base.value = 9;
    expect(str.value).toBe('item-9');
  });

  it('reacts to a getter returning different types', () => {
    const src = ref<unknown>(0);
    const str = useToString(() => src.value);
    expect(str.value).toBe('0');
    src.value = true;
    expect(str.value).toBe('true');
    src.value = null;
    expect(str.value).toBe('null');
  });

  it('returns a readonly computed ref', () => {
    const str = useToString(ref(1));
    expect(typeof str.value).toBe('string');
    // ComputedRef exposes a value getter; result is always a string
    expect(str.value).toBe('1');
  });
});
