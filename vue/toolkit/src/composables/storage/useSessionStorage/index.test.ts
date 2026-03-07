import { describe, it, expect, beforeEach } from 'vitest';
import { nextTick } from 'vue';
import { useSessionStorage } from '.';

describe(useSessionStorage, () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('stores and reads a string via sessionStorage', async () => {
    const state = useSessionStorage<string>('ss-string', 'hello');

    expect(state.value).toBe('hello');
    expect(sessionStorage.getItem('ss-string')).toBe('hello');

    state.value = 'world';
    await nextTick();

    expect(sessionStorage.getItem('ss-string')).toBe('world');
  });

  it('stores and reads a number', async () => {
    const state = useSessionStorage<number>('ss-number', 42);

    expect(state.value).toBe(42);

    state.value = 100;
    await nextTick();

    expect(sessionStorage.getItem('ss-number')).toBe('100');
  });

  it('stores and reads an object', async () => {
    const state = useSessionStorage('ss-obj', { a: 1 });

    expect(state.value).toEqual({ a: 1 });

    state.value = { a: 2 };
    await nextTick();

    expect(JSON.parse(sessionStorage.getItem('ss-obj')!)).toEqual({ a: 2 });
  });

  it('reads existing value from sessionStorage on init', () => {
    sessionStorage.setItem('ss-existing', '"stored"');

    const state = useSessionStorage('ss-existing', 'default', {
      serializer: { read: v => JSON.parse(v), write: v => JSON.stringify(v) },
    });

    expect(state.value).toBe('stored');
  });

  it('removes from sessionStorage when set to null', async () => {
    const state = useSessionStorage<string | null>('ss-null', 'value');
    expect(sessionStorage.getItem('ss-null')).toBe('value');

    state.value = null;
    await nextTick();

    expect(sessionStorage.getItem('ss-null')).toBeNull();
  });

  it('passes options through to useStorage', () => {
    const state = useSessionStorage<string>('ss-no-write', 'default', {
      writeDefaults: false,
    });

    expect(state.value).toBe('default');
    expect(sessionStorage.getItem('ss-no-write')).toBeNull();
  });
});
