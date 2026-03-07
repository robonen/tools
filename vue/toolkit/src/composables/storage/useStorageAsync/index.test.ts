import { describe, it, expect, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { useStorageAsync } from '.';
import type { StorageLikeAsync } from '.';

function createMockAsyncStorage(): StorageLikeAsync & { store: Map<string, string> } {
  const store = new Map<string, string>();

  return {
    store,
    getItem: async (key: string) => store.get(key) ?? null,
    setItem: async (key: string, value: string) => { store.set(key, value); },
    removeItem: async (key: string) => { store.delete(key); },
  };
}

function createDelayedAsyncStorage(delay: number): StorageLikeAsync & { store: Map<string, string> } {
  const store = new Map<string, string>();

  return {
    store,
    getItem: (key: string) => new Promise(resolve => setTimeout(() => resolve(store.get(key) ?? null), delay)),
    setItem: (key: string, value: string) => new Promise(resolve => setTimeout(() => {
      store.set(key, value);
      resolve();
    }, delay)),
    removeItem: (key: string) => new Promise(resolve => setTimeout(() => {
      store.delete(key);
      resolve();
    }, delay)),
  };
}

describe(useStorageAsync, () => {
  // --- Basic read/write ---

  it('returns default value before storage is ready', () => {
    const storage = createMockAsyncStorage();
    const { state, isReady } = useStorageAsync('key', 'default', storage);

    expect(state.value).toBe('default');
    expect(isReady.value).toBeFalsy();
  });

  it('reads existing value from async storage', async () => {
    const storage = createMockAsyncStorage();
    storage.store.set('key', 'stored');

    const { state, isReady } = await useStorageAsync('key', 'default', storage);

    expect(state.value).toBe('stored');
    expect(isReady.value).toBeTruthy();
  });

  it('writes value to async storage on change', async () => {
    const storage = createMockAsyncStorage();
    const { state } = await useStorageAsync<string>('key', 'initial', storage);

    state.value = 'updated';
    await nextTick();

    // Allow async write to complete
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(storage.store.get('key')).toBe('updated');
  });

  // --- Types ---

  it('reads and writes a number', async () => {
    const storage = createMockAsyncStorage();
    storage.store.set('num', '42');

    const { state } = await useStorageAsync<number>('num', 0, storage);

    expect(state.value).toBe(42);

    state.value = 100;
    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(storage.store.get('num')).toBe('100');
  });

  it('reads and writes a boolean', async () => {
    const storage = createMockAsyncStorage();
    storage.store.set('flag', 'true');

    const { state } = await useStorageAsync('flag', false, storage);

    expect(state.value).toBeTruthy();

    state.value = false;
    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(storage.store.get('flag')).toBe('false');
  });

  it('reads and writes an object', async () => {
    const storage = createMockAsyncStorage();
    storage.store.set('obj', JSON.stringify({ a: 1 }));

    const { state } = await useStorageAsync('obj', { a: 0, b: 2 }, storage);

    expect(state.value).toEqual({ a: 1 });
  });

  // --- Awaitable ---

  it('is awaitable and resolves after initial read', async () => {
    const storage = createDelayedAsyncStorage(50);
    storage.store.set('delayed', 'loaded');

    const { state, isReady } = await useStorageAsync('delayed', 'default', storage);

    expect(state.value).toBe('loaded');
    expect(isReady.value).toBeTruthy();
  });

  // --- onReady callback ---

  it('calls onReady callback after initial load', async () => {
    const storage = createMockAsyncStorage();
    storage.store.set('ready', 'ready-value');

    const onReady = vi.fn();

    await useStorageAsync('ready', 'default', storage, { onReady });

    expect(onReady).toHaveBeenCalledOnce();
    expect(onReady).toHaveBeenCalledWith('ready-value');
  });

  it('calls onReady with default when key not in storage', async () => {
    const storage = createMockAsyncStorage();
    const onReady = vi.fn();

    await useStorageAsync('missing', 'fallback', storage, { onReady });

    expect(onReady).toHaveBeenCalledWith('fallback');
  });

  // --- Merge defaults ---

  it('merges defaults with stored value', async () => {
    const storage = createMockAsyncStorage();
    storage.store.set('merge', JSON.stringify({ hello: 'stored' }));

    const { state } = await useStorageAsync(
      'merge',
      { hello: 'default', greeting: 'hi' },
      storage,
      { mergeDefaults: true },
    );

    expect(state.value.hello).toBe('stored');
    expect(state.value.greeting).toBe('hi');
  });

  it('uses custom merge function', async () => {
    const storage = createMockAsyncStorage();
    storage.store.set('merge-fn', JSON.stringify({ a: 1 }));

    const { state } = await useStorageAsync(
      'merge-fn',
      { a: 0, b: 2 },
      storage,
      {
        mergeDefaults: (stored, defaults) => ({ ...defaults, ...stored, b: stored.b ?? defaults.b }),
      },
    );

    expect(state.value).toEqual({ a: 1, b: 2 });
  });

  // --- Custom serializer ---

  it('uses custom async serializer', async () => {
    const storage = createMockAsyncStorage();
    storage.store.set('custom', '1,2,3');

    const serializer = {
      read: async (v: string) => v.split(',').map(Number),
      write: async (v: number[]) => v.join(','),
    };

    const { state } = await useStorageAsync('custom', [0], storage, { serializer });

    expect(state.value).toEqual([1, 2, 3]);

    state.value = [4, 5, 6];
    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(storage.store.get('custom')).toBe('4,5,6');
  });

  // --- Null / remove ---

  it('removes from storage when value is set to null', async () => {
    const storage = createMockAsyncStorage();
    storage.store.set('nullable', 'exists');

    const { state } = await useStorageAsync<string | null>('nullable', 'default', storage);

    state.value = null;
    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(storage.store.has('nullable')).toBeFalsy();
  });

  // --- Error handling ---

  it('calls onError when read fails', async () => {
    const onError = vi.fn();
    const storage: StorageLikeAsync = {
      getItem: async () => { throw new Error('read failure'); },
      setItem: async () => {},
      removeItem: async () => {},
    };

    const { state } = await useStorageAsync('fail-read', 'fallback', storage, { onError });

    expect(onError).toHaveBeenCalledOnce();
    expect(state.value).toBe('fallback');
  });

  it('calls onError when write fails', async () => {
    const onError = vi.fn();
    const storage: StorageLikeAsync = {
      getItem: async () => null,
      setItem: async () => { throw new Error('write failure'); },
      removeItem: async () => {},
    };

    const { state } = await useStorageAsync<string>('fail-write', 'initial', storage, { onError });

    // One error from writeDefaults persisting initial value
    expect(onError).toHaveBeenCalledOnce();

    state.value = 'new';
    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    // Another error from the write triggered by value change
    expect(onError).toHaveBeenCalledTimes(2);
  });

  // --- No unnecessary write-back on initial read ---

  it('does not write back to storage after initial read', async () => {
    const setItem = vi.fn(async () => {});
    const storage: StorageLikeAsync = {
      getItem: async () => 'existing',
      setItem,
      removeItem: async () => {},
    };

    await useStorageAsync('key', 'default', storage);
    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(setItem).not.toHaveBeenCalled();
  });

  it('does not write back to storage when key is missing and writeDefaults is false', async () => {
    const setItem = vi.fn(async () => {});
    const storage: StorageLikeAsync = {
      getItem: async () => null,
      setItem,
      removeItem: async () => {},
    };

    await useStorageAsync('key', 'default', storage, { writeDefaults: false });
    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(setItem).not.toHaveBeenCalled();
  });

  // --- shallow: false with deep mutation ---

  it('writes to storage on deep object mutation with shallow: false', async () => {
    const storage = createMockAsyncStorage();
    const { state } = await useStorageAsync(
      'deep-obj',
      { nested: { count: 0 } },
      storage,
      { shallow: false },
    );

    state.value.nested.count = 42;
    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(JSON.parse(storage.store.get('deep-obj')!)).toEqual({ nested: { count: 42 } });
  });

  // --- Multiple rapid assignments ---

  it('handles multiple rapid assignments', async () => {
    const storage = createMockAsyncStorage();
    const { state } = await useStorageAsync<string>('rapid', 'initial', storage);

    state.value = 'first';
    state.value = 'second';
    state.value = 'third';
    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(storage.store.get('rapid')).toBe('third');
  });

  // --- writeDefaults ---

  it('persists defaults to storage when key does not exist', async () => {
    const storage = createMockAsyncStorage();

    await useStorageAsync('new-key', 'default-val', storage);

    expect(storage.store.get('new-key')).toBe('default-val');
  });

  it('does not persist defaults when writeDefaults is false', async () => {
    const storage = createMockAsyncStorage();

    await useStorageAsync('new-key', 'default-val', storage, { writeDefaults: false });

    expect(storage.store.has('new-key')).toBeFalsy();
  });

  it('does not overwrite existing value with defaults', async () => {
    const storage = createMockAsyncStorage();
    storage.store.set('existing', 'stored');

    await useStorageAsync('existing', 'default', storage);

    expect(storage.store.get('existing')).toBe('stored');
  });

  // --- Reactive key ---

  it('re-reads from async storage when reactive key changes', async () => {
    const storage = createMockAsyncStorage();
    storage.store.set('key-a', 'value-a');
    storage.store.set('key-b', 'value-b');

    const keyRef = ref('key-a');
    const { state } = await useStorageAsync<string>(keyRef, 'default', storage);

    expect(state.value).toBe('value-a');

    keyRef.value = 'key-b';
    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(state.value).toBe('value-b');
  });

  // --- eventFilter ---

  it('applies event filter to writes', async () => {
    const storage = createMockAsyncStorage();
    let captured: (() => void) | undefined;

    const { state } = await useStorageAsync<string>('filtered', 'initial', storage, {
      eventFilter: (invoke) => { captured = invoke; },
    });

    const setItem = vi.spyOn(storage, 'setItem');
    (setItem as any).mockClear();

    state.value = 'filtered-value';
    await nextTick();

    // Not written yet — held by filter
    expect(setItem).not.toHaveBeenCalled();
    expect(captured).toBeDefined();

    // Release the filter
    captured!();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(setItem).toHaveBeenCalled();
  });
});
