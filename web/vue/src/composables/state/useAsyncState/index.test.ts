import { isShallow, nextTick, ref } from 'vue';
import { it, expect, describe, vi, beforeEach, afterEach } from 'vitest';
import { useAsyncState } from '.';

describe(useAsyncState, () => {
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
    expect(isReady.value).toBeFalsy();
    expect(isLoading.value).toBeTruthy();
    expect(error.value).toBe(null);

    await nextTick();
    await nextTick();

    expect(state.value).toBe('data');
    expect(isReady.value).toBeTruthy();
    expect(isLoading.value).toBeFalsy();
    expect(error.value).toBe(null);
  });

  it('works with a function returning a promise', async () => {
    const { state, isReady, isLoading, error } = useAsyncState(
      () => Promise.resolve('data'),
      'initial',
    );

    expect(state.value).toBe('initial');
    expect(isReady.value).toBeFalsy();
    expect(isLoading.value).toBeTruthy();
    expect(error.value).toBe(null);

    await nextTick();
    await nextTick();

    expect(state.value).toBe('data');
    expect(isReady.value).toBeTruthy();
    expect(isLoading.value).toBeFalsy();
    expect(error.value).toBe(null);
  });

  it('handles errors', async () => {
    const { state, isReady, isLoading, error } = useAsyncState(
      Promise.reject(new Error('test-error')),
      'initial',
    );

    expect(state.value).toBe('initial');
    expect(isReady.value).toBeFalsy();
    expect(isLoading.value).toBeTruthy();
    expect(error.value).toBe(null);

    await nextTick();
    await nextTick();

    expect(state.value).toBe('initial');
    expect(isReady.value).toBeFalsy();
    expect(isLoading.value).toBeFalsy();
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
    expect(isLoading.value).toBeTruthy();

    await vi.advanceTimersByTimeAsync(50);
    expect(isLoading.value).toBeTruthy();

    await vi.advanceTimersByTimeAsync(50);
    await promise;
    expect(isLoading.value).toBeFalsy();
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
    expect(isLoading.value).toBeTruthy();
    expect(isReady.value).toBeFalsy();
    expect(error.value).toBe(null);

    await nextTick();
    await nextTick();

    expect(state.value).toBe('data');
    expect(isReady.value).toBeTruthy();
    expect(isLoading.value).toBeFalsy();
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
    expect(isShallow(state)).toBeTruthy();
  });

  it('uses ref when shallow is false', async () => {
    const { state } = await useAsyncState(
      Promise.resolve({ a: ref(1) }),
      { a: ref(0) },
      { shallow: false },
    );

    expect(state.value.a).toBe(1);
    expect(isShallow(state)).toBeFalsy();
  });

  it('aborts pending execution', async () => {
    let resolvePromise: (value: string) => void;
    const promiseFn = () => new Promise<string>(resolve => { resolvePromise = resolve; });

    const { state, isLoading, abort, executeImmediately } = useAsyncState(
      promiseFn,
      'initial',
      { immediate: false },
    );

    executeImmediately();
    expect(isLoading.value).toBeTruthy();

    abort();
    expect(isLoading.value).toBeFalsy();

    resolvePromise!('data');
    await nextTick();

    expect(state.value).toBe('initial');
  });

  it('abort prevents state update from resolved promise', async () => {
    let resolvePromise: (value: string) => void;
    const promiseFn = () => new Promise<string>(resolve => { resolvePromise = resolve; });

    const { state, isLoading, isReady, abort, executeImmediately } = useAsyncState(
      promiseFn,
      'initial',
      { immediate: false },
    );

    executeImmediately();
    expect(isLoading.value).toBeTruthy();

    abort();
    expect(isLoading.value).toBeFalsy();

    resolvePromise!('data');
    await nextTick();

    expect(state.value).toBe('initial');
    expect(isReady.value).toBeFalsy();
  });

  it('abort prevents error handling from rejected promise', async () => {
    let rejectPromise: (error: Error) => void;
    const promiseFn = () => new Promise<string>((_, reject) => { rejectPromise = reject; });
    const onError = vi.fn();

    const { error, abort, executeImmediately } = useAsyncState(
      promiseFn,
      'initial',
      { immediate: false, onError },
    );

    executeImmediately();
    abort();

    rejectPromise!(new Error('test-error'));
    await nextTick();

    expect(error.value).toBe(null);
    expect(onError).not.toHaveBeenCalled();
  });

  it('new execute after abort works correctly', async () => {
    let resolvePromise: (value: string) => void;
    const promiseFn = () => new Promise<string>(resolve => { resolvePromise = resolve; });

    const { state, isReady, abort, executeImmediately } = useAsyncState(
      promiseFn,
      'initial',
      { immediate: false },
    );

    executeImmediately();
    abort();

    executeImmediately();
    resolvePromise!('new data');
    await nextTick();
    await nextTick();

    expect(state.value).toBe('new data');
    expect(isReady.value).toBeTruthy();
  });

  it('re-execute cancels previous pending execution', async () => {
    let callCount = 0;
    const promiseFn = (value: string) => new Promise<string>(resolve => {
      callCount++;
      setTimeout(() => resolve(value), 100);
    });

    const { state, executeImmediately } = useAsyncState(
      promiseFn,
      'initial',
      { immediate: false },
    );

    executeImmediately('first');
    executeImmediately('second');

    await vi.advanceTimersByTimeAsync(100);

    expect(state.value).toBe('second');
    expect(callCount).toBe(2);
  });
});
