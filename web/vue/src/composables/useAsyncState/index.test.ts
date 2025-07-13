import { isShallow, nextTick, ref } from 'vue';
import { it, expect, describe, vi, beforeEach, afterEach } from 'vitest';
import { useAsyncState } from '.';

describe('useAsyncState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('works with a promise', async () => {
    const { state, isReady, isLoading, error } = useAsyncState(
      Promise.resolve('data'),
      'initial',
    );

    expect(state.value).toBe('initial');
    expect(isReady.value).toBe(false);
    expect(isLoading.value).toBe(true);
    expect(error.value).toBe(null);

    await nextTick();

    expect(state.value).toBe('data');
    expect(isReady.value).toBe(true);
    expect(isLoading.value).toBe(false);
    expect(error.value).toBe(null);
  });

  it('works with a function returning a promise', async () => {
    const { state, isReady, isLoading, error } = useAsyncState(
      () => Promise.resolve('data'),
      'initial',
    );

    expect(state.value).toBe('initial');
    expect(isReady.value).toBe(false);
    expect(isLoading.value).toBe(true);
    expect(error.value).toBe(null);

    await nextTick();

    expect(state.value).toBe('data');
    expect(isReady.value).toBe(true);
    expect(isLoading.value).toBe(false);
    expect(error.value).toBe(null);
  });

  it('handles errors', async () => {
    const { state, isReady, isLoading, error } = useAsyncState(
      Promise.reject(new Error('test-error')),
      'initial',
    );

    expect(state.value).toBe('initial');
    expect(isReady.value).toBe(false);
    expect(isLoading.value).toBe(true);
    expect(error.value).toBe(null);

    await nextTick();

    expect(state.value).toBe('initial');
    expect(isReady.value).toBe(false);
    expect(isLoading.value).toBe(false);
    expect(error.value).toEqual(new Error('test-error'));
  });

  it('calls onSuccess callback', async () => {
    const onSuccess = vi.fn();
  
    useAsyncState(
      Promise.resolve('data'),
      'initial',
      { onSuccess },
    );

    await nextTick();

    expect(onSuccess).toHaveBeenCalledWith('data');
  });

  it('calls onError callback', async () => {
    const onError = vi.fn();
    const error = new Error('test-error');
  
    useAsyncState(
      Promise.reject(error),
      'initial',
      { onError },
    );

    await nextTick();

    expect(onError).toHaveBeenCalledWith(error);
  });

  it('throws error if throwError is true', async () => {
    const error = new Error('test-error');
  
    const { executeImmediately } = useAsyncState(
      Promise.reject(error),
      'initial',
      { immediate: false, throwError: true },
    );

    await expect(() => executeImmediately()).rejects.toThrow(error);
  });

  it('resets state on execute if resetOnExecute is true', async () => {
    const { state, executeImmediately } = useAsyncState(
      (data: string) => Promise.resolve(data),
      'initial',
      { immediate: false, resetOnExecute: true },
    );

    await executeImmediately('new data');
    expect(state.value).toBe('new data');

    executeImmediately('another data');
    expect(state.value).toBe('initial');
  });

  it('delays execution with default delay', async () => {
    const { isLoading, execute } = useAsyncState(
      () => Promise.resolve('data'),
      'initial',
      { delay: 100, immediate: false },
    );

    const promise = execute();
    expect(isLoading.value).toBe(true);

    await vi.advanceTimersByTimeAsync(50);
    expect(isLoading.value).toBe(true);

    await vi.advanceTimersByTimeAsync(50);
    await promise;
    expect(isLoading.value).toBe(false);
  });

  it('is awaitable', async () => {
    const { state } = await useAsyncState(
      Promise.resolve('data'),
      'initial',
    );

    expect(state.value).toBe('data');
  });

  it('works with executeImmediately', async () => {
    const { state, isReady, isLoading, error, executeImmediately } = useAsyncState(
      () => Promise.resolve('data'),
      'initial',
      { immediate: false },
    );

    executeImmediately();

    expect(state.value).toBe('initial');
    expect(isLoading.value).toBe(true);
    expect(isReady.value).toBe(false);
    expect(error.value).toBe(null);

    await nextTick();

    expect(state.value).toBe('data');
    expect(isReady.value).toBe(true);
    expect(isLoading.value).toBe(false);
    expect(error.value).toBe(null);
  });

  it('passes params to the function', async () => {
    const promiseFn = vi.fn((...args: any[]) => Promise.resolve(args.join(' ')));

    const { executeImmediately } = useAsyncState(
      promiseFn,
      'initial',
      { immediate: false },
    );

    await executeImmediately('hello', 'world');

    expect(promiseFn).toHaveBeenCalledWith('hello', 'world');
  });

  it('uses shallowRef by default', async () => {
    const { state } = await useAsyncState(
      Promise.resolve({ a: 1 }),
      { a: 0 },
    );
  
    expect(state.value.a).toBe(1);
    expect(isShallow(state)).toBe(true);
  });

  it('uses ref when shallow is false', async () => {
    const { state } = await useAsyncState(
      Promise.resolve({ a: ref(1) }),
      { a: ref(0) },
      { shallow: false },
    );

    expect(state.value.a).toBe(1);
    expect(isShallow(state)).toBe(false);
  });
});
