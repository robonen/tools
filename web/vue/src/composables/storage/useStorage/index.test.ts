import { describe, it, expect, vi } from 'vitest';
import { nextTick } from 'vue';
import { useStorage, StorageSerializers, type StorageLike } from '.';

function createMockStorage(): StorageLike & { store: Map<string, string> } {
  const store = new Map<string, string>();

  return {
    store,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  };
}

describe('useStorage', () => {
  // --- Basic types ---

  it('stores and reads a string', async () => {
    const storage = createMockStorage();
    const state = useStorage<string>('test-string', 'hello', storage);

    expect(state.value).toBe('hello');
    expect(storage.getItem('test-string')).toBe('hello');

    state.value = 'world';
    await nextTick();

    expect(storage.getItem('test-string')).toBe('world');
  });

  it('stores and reads a number', async () => {
    const storage = createMockStorage();
    const state = useStorage<number>('test-number', 42, storage);

    expect(state.value).toBe(42);

    state.value = 100;
    await nextTick();

    expect(storage.getItem('test-number')).toBe('100');
  });

  it('stores and reads a boolean', async () => {
    const storage = createMockStorage();
    const state = useStorage<boolean>('test-bool', true, storage);

    expect(state.value).toBe(true);

    state.value = false;
    await nextTick();

    expect(storage.getItem('test-bool')).toBe('false');
  });

  it('stores and reads an object', async () => {
    const storage = createMockStorage();
    const state = useStorage('test-obj', { a: 1, b: 'two' }, storage);

    expect(state.value).toEqual({ a: 1, b: 'two' });

    state.value = { a: 2, b: 'three' };
    await nextTick();

    expect(JSON.parse(storage.getItem('test-obj')!)).toEqual({ a: 2, b: 'three' });
  });

  // --- Reads existing value from storage ---

  it('reads existing value from storage on init', () => {
    const storage = createMockStorage();
    storage.store.set('existing', '"stored-value"');

    const state = useStorage('existing', 'default', storage, {
      serializer: StorageSerializers.object,
    });

    expect(state.value).toBe('stored-value');
  });

  // --- Removes item when set to null ---

  it('removes from storage when value is set to null', async () => {
    const storage = createMockStorage();
    const state = useStorage<string | null>('test-null', 'value', storage);

    await nextTick();
    expect(storage.getItem('test-null')).toBe('value');

    state.value = null;
    await nextTick();

    expect(storage.getItem('test-null')).toBeNull();
  });

  // --- Custom serializer ---

  it('uses custom serializer', async () => {
    const storage = createMockStorage();

    const serializer = {
      read: (v: string) => v.split(',').map(Number),
      write: (v: number[]) => v.join(','),
    };

    const state = useStorage('custom-ser', [1, 2, 3], storage, { serializer });

    expect(state.value).toEqual([1, 2, 3]);

    state.value = [4, 5, 6];
    await nextTick();

    expect(storage.getItem('custom-ser')).toBe('4,5,6');
  });

  // --- Merge defaults ---

  it('merges defaults with stored value', () => {
    const storage = createMockStorage();
    storage.store.set('merge-test', JSON.stringify({ hello: 'stored' }));

    const state = useStorage(
      'merge-test',
      { hello: 'default', greeting: 'hi' },
      storage,
      { mergeDefaults: true },
    );

    expect(state.value.hello).toBe('stored');
    expect(state.value.greeting).toBe('hi');
  });

  it('uses custom merge function', () => {
    const storage = createMockStorage();
    storage.store.set('merge-fn', JSON.stringify({ a: 1 }));

    const state = useStorage(
      'merge-fn',
      { a: 0, b: 2 },
      storage,
      {
        mergeDefaults: (stored, defaults) => ({ ...defaults, ...stored, b: stored.b ?? defaults.b }),
      },
    );

    expect(state.value).toEqual({ a: 1, b: 2 });
  });

  // --- Map and Set ---

  it('stores and reads a Map', async () => {
    const storage = createMockStorage();
    const initial = new Map([['key1', 'val1']]);
    const state = useStorage('test-map', initial, storage);

    expect(state.value).toEqual(new Map([['key1', 'val1']]));

    state.value = new Map([['key2', 'val2']]);
    await nextTick();

    const raw = storage.getItem('test-map');
    expect(JSON.parse(raw!)).toEqual([['key2', 'val2']]);
  });

  it('stores and reads a Set', async () => {
    const storage = createMockStorage();
    const initial = new Set([1, 2, 3]);
    const state = useStorage('test-set', initial, storage);

    expect(state.value).toEqual(new Set([1, 2, 3]));

    state.value = new Set([4, 5]);
    await nextTick();

    const raw = storage.getItem('test-set');
    expect(JSON.parse(raw!)).toEqual([4, 5]);
  });

  // --- Date ---

  it('stores and reads a Date', async () => {
    const storage = createMockStorage();
    const date = new Date('2026-02-14T00:00:00.000Z');
    const state = useStorage('test-date', date, storage);

    expect(state.value).toEqual(date);

    const newDate = new Date('2026-12-25T00:00:00.000Z');
    state.value = newDate;
    await nextTick();

    expect(storage.getItem('test-date')).toBe(newDate.toISOString());
  });

  // --- Error handling ---

  it('calls onError when read fails', () => {
    const storage = createMockStorage();
    storage.store.set('bad-json', '{invalid');
    const onError = vi.fn();

    const state = useStorage('bad-json', { fallback: true }, storage, { onError });

    expect(onError).toHaveBeenCalledOnce();
    expect(state.value).toEqual({ fallback: true });
  });

  it('calls onError when write fails', async () => {
    const onError = vi.fn();
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => { throw new Error('quota exceeded'); },
      removeItem: () => {},
    };

    const state = useStorage<string>('fail-write', 'init', storage, { onError });

    // One error from initial persist of defaults
    expect(onError).toHaveBeenCalledOnce();

    state.value = 'new';
    await nextTick();

    // Another error from the write triggered by value change
    expect(onError).toHaveBeenCalledTimes(2);
  });

  // --- Persists defaults on init ---

  it('persists default value to storage on init when key does not exist', () => {
    const storage = createMockStorage();
    useStorage('new-key', 'default-val', storage);

    expect(storage.getItem('new-key')).toBe('default-val');
  });

  it('does not overwrite existing storage value with defaults', () => {
    const storage = createMockStorage();
    storage.store.set('existing-key', 'existing-val');

    useStorage('existing-key', 'default-val', storage);

    expect(storage.getItem('existing-key')).toBe('existing-val');
  });

  // --- writeDefaults: false ---

  it('does not persist defaults when writeDefaults is false', () => {
    const storage = createMockStorage();
    useStorage('no-write', 'default-val', storage, { writeDefaults: false });

    expect(storage.getItem('no-write')).toBeNull();
  });

  // --- No infinite loop on init ---

  it('calls setItem exactly once on init for writeDefaults', () => {
    const setItem = vi.fn();
    const storage: StorageLike = {
      getItem: () => null,
      setItem,
      removeItem: vi.fn(),
    };

    useStorage<string>('init-key', 'value', storage);

    expect(setItem).toHaveBeenCalledOnce();
    expect(setItem).toHaveBeenCalledWith('init-key', 'value');
  });

  // --- No-op write when value unchanged ---

  it('does not call setItem when value is unchanged', async () => {
    const storage = createMockStorage();
    const state = useStorage<string>('noop-key', 'same', storage);

    const setItem = vi.spyOn(storage, 'setItem');
    setItem.mockClear();

    // Re-assign the same value
    state.value = 'same';
    await nextTick();

    expect(setItem).not.toHaveBeenCalled();
  });

  // --- shallow: false with deep mutation ---

  it('writes to storage on deep object mutation with shallow: false', async () => {
    const storage = createMockStorage();
    const state = useStorage('deep-obj', { nested: { count: 0 } }, storage, { shallow: false });

    expect(state.value.nested.count).toBe(0);

    state.value.nested.count = 42;
    await nextTick();

    expect(JSON.parse(storage.getItem('deep-obj')!)).toEqual({ nested: { count: 42 } });
  });

  // --- Multiple rapid assignments ---

  it('only writes last value when multiple assignments happen before flush', async () => {
    const storage = createMockStorage();
    const state = useStorage<string>('rapid-key', 'initial', storage);

    const setItem = vi.spyOn(storage, 'setItem');
    setItem.mockClear();

    state.value = 'first';
    state.value = 'second';
    state.value = 'third';
    await nextTick();

    // Watcher fires once with the last value (pre flush batches)
    expect(storage.getItem('rapid-key')).toBe('third');
  });
});
