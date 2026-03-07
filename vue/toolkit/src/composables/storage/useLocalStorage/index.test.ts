import { describe, it, expect, beforeEach } from 'vitest';
import { nextTick } from 'vue';
import { useLocalStorage } from '.';

describe(useLocalStorage, () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores and reads a string via localStorage', async () => {
    const state = useLocalStorage<string>('ls-string', 'hello');

    expect(state.value).toBe('hello');
    expect(localStorage.getItem('ls-string')).toBe('hello');

    state.value = 'world';
    await nextTick();

    expect(localStorage.getItem('ls-string')).toBe('world');
  });

  it('stores and reads a number', async () => {
    const state = useLocalStorage<number>('ls-number', 42);

    expect(state.value).toBe(42);

    state.value = 100;
    await nextTick();

    expect(localStorage.getItem('ls-number')).toBe('100');
  });

  it('stores and reads an object', async () => {
    const state = useLocalStorage('ls-obj', { a: 1 });

    expect(state.value).toEqual({ a: 1 });

    state.value = { a: 2 };
    await nextTick();

    expect(JSON.parse(localStorage.getItem('ls-obj')!)).toEqual({ a: 2 });
  });

  it('reads existing value from localStorage on init', () => {
    localStorage.setItem('ls-existing', '"stored"');

    const state = useLocalStorage('ls-existing', 'default', {
      serializer: { read: v => JSON.parse(v), write: v => JSON.stringify(v) },
    });

    expect(state.value).toBe('stored');
  });

  it('removes from localStorage when set to null', async () => {
    const state = useLocalStorage<string | null>('ls-null', 'value');
    expect(localStorage.getItem('ls-null')).toBe('value');

    state.value = null;
    await nextTick();

    expect(localStorage.getItem('ls-null')).toBeNull();
  });

  it('passes options through to useStorage', () => {
    const state = useLocalStorage<string>('ls-no-write', 'default', {
      writeDefaults: false,
    });

    expect(state.value).toBe('default');
    expect(localStorage.getItem('ls-no-write')).toBeNull();
  });
});
