import { describe, expect, it } from 'vitest';
import { isReadonly, ref } from 'vue';
import { refDefault } from '.';

describe(refDefault, () => {
  it('returns the default when the source is null', () => {
    const source = ref<string | null>(null);
    const wrapped = refDefault(source, 'fallback');
    expect(wrapped.value).toBe('fallback');
  });

  it('returns the default when the source is undefined', () => {
    const source = ref<string | undefined>(undefined);
    const wrapped = refDefault(source, 'fallback');
    expect(wrapped.value).toBe('fallback');
  });

  it('returns the source value when it is present', () => {
    const source = ref<string | null>('actual');
    const wrapped = refDefault(source, 'fallback');
    expect(wrapped.value).toBe('actual');
  });

  it('reacts when the source becomes null or non-null', () => {
    const source = ref<string | null>('initial');
    const wrapped = refDefault(source, 'fallback');
    expect(wrapped.value).toBe('initial');
    source.value = null;
    expect(wrapped.value).toBe('fallback');
    source.value = 'restored';
    expect(wrapped.value).toBe('restored');
  });

  it('does NOT replace falsy-but-defined values (0, empty string, false)', () => {
    expect(refDefault(ref<number | null>(0), 99).value).toBe(0);
    expect(refDefault(ref<string | null>(''), 'x').value).toBe('');
    expect(refDefault(ref<boolean | null>(false), true).value).toBeFalsy();
  });

  it('writes pass straight through to the source', () => {
    const source = ref<string | null>(null);
    const wrapped = refDefault(source, 'fallback');
    wrapped.value = 'written';
    expect(source.value).toBe('written');
    expect(wrapped.value).toBe('written');
  });

  it('can be written back to null, which re-exposes the default on read', () => {
    const source = ref<string | null>('present');
    const wrapped = refDefault(source, 'fallback');
    wrapped.value = null as never;
    expect(source.value).toBeNull();
    expect(wrapped.value).toBe('fallback');
  });

  it('supports a reactive (ref) default value', () => {
    const fallback = ref('guest');
    const wrapped = refDefault(ref<string | null>(null), fallback);
    expect(wrapped.value).toBe('guest');
    fallback.value = 'visitor';
    expect(wrapped.value).toBe('visitor');
  });

  it('supports a getter default value', () => {
    const base = ref(2);
    const wrapped = refDefault(ref<string | null>(null), () => `item-${base.value}`);
    expect(wrapped.value).toBe('item-2');
    base.value = 5;
    expect(wrapped.value).toBe('item-5');
  });

  it('prefers the source over a reactive default once the source is set', () => {
    const fallback = ref('guest');
    const source = ref<string | null>(null);
    const wrapped = refDefault(source, fallback);
    expect(wrapped.value).toBe('guest');
    source.value = 'ada';
    expect(wrapped.value).toBe('ada');
    fallback.value = 'changed';
    expect(wrapped.value).toBe('ada');
  });

  it('works with object sources', () => {
    const fallback = { id: 0 };
    const source = ref<{ id: number } | null>(null);
    const wrapped = refDefault(source, fallback);
    // ref does not proxy the plain default object, so identity is preserved
    expect(wrapped.value).toBe(fallback);
    source.value = { id: 1 };
    // ref() wraps object source values in a reactive proxy; compare by shape
    expect(wrapped.value).toStrictEqual({ id: 1 });
    expect(wrapped.value).toBe(source.value);
  });

  it('returns a writable (non-readonly) computed ref', () => {
    const wrapped = refDefault(ref<string | null>(null), 'fallback');
    expect(isReadonly(wrapped)).toBeFalsy();
  });
});
