import { ref, shallowRef, watch } from 'vue';
import type { Ref, ShallowRef, UnwrapRef } from 'vue';
import { isFunction, sleep, cancellablePromise as makeCancellable, CancelledError } from '@robonen/stdlib';

export interface UseAsyncStateOptions<Shallow extends boolean, Data = any> {
  delay?: number;
  shallow?: Shallow;
  immediate?: boolean;
  resetOnExecute?: boolean;
  throwError?: boolean;
  onError?: (error: unknown) => void;
  onSuccess?: (data: Data) => void;
}

export interface UseAsyncStateReturnBase<Data, Params extends any[], Shallow extends boolean> {
  state: Shallow extends true ? ShallowRef<Data> : Ref<UnwrapRef<Data>>;
  isLoading: Ref<boolean>;
  isReady: Ref<boolean>;
  error: Ref<unknown | null>;
  execute: (delay?: number, ...params: Params) => Promise<Data>;
  executeImmediately: (...params: Params) => Promise<Data>;
  abort: () => void;
}

export type UseAsyncStateReturn<Data, Params extends any[], Shallow extends boolean> =
  & UseAsyncStateReturnBase<Data, Params, Shallow>
  & PromiseLike<UseAsyncStateReturnBase<Data, Params, Shallow>>;

/**
 * @name useAsyncState
 * @category State
 * @description A composable that provides a state for async operations without setup blocking
 */
export function useAsyncState<Data, Params extends any[] = [], Shallow extends boolean = true>(
  maybePromise: Promise<Data> | ((...args: Params) => Promise<Data>),
  initialState: Data,
  options?: UseAsyncStateOptions<Shallow, Data>,
): UseAsyncStateReturn<Data, Params, Shallow> {
  const {
    delay = 0,
    shallow = true,
    immediate = true,
    resetOnExecute = false,
    throwError = false,
    onError,
    onSuccess,
  } = options ?? {};

  const state = shallow ? shallowRef(initialState) : ref(initialState);
  const error = ref<unknown | null>(null);
  const isLoading = ref(false);
  const isReady = ref(false);

  let cancelPending: ((reason?: string) => void) | undefined;

  const execute = async (actualDelay = delay, ...params: any[]) => {
    cancelPending?.();

    let active = true;
    cancelPending = () => { active = false; };

    if (resetOnExecute)
      state.value = initialState;

    isLoading.value = true;
    isReady.value = false;
    error.value = null;

    if (actualDelay > 0)
      await sleep(actualDelay);

    if (!active)
      return state.value as Data;

    const rawPromise = isFunction(maybePromise) ? maybePromise(...params as Params) : maybePromise;
    const { promise, cancel } = makeCancellable(rawPromise);
    cancelPending = (reason?: string) => {
      active = false;
      cancel(reason);
    };

    try {
      const data = await promise;

      state.value = data;
      isReady.value = true;
      onSuccess?.(data);
    }
    catch (e: unknown) {
      if (e instanceof CancelledError)
        return state.value as Data;

      error.value = e;
      onError?.(e);

      if (throwError)
        throw e;
    }
    finally {
      if (active)
        isLoading.value = false;
    }

    return state.value as Data;
  };

  const executeImmediately = (...params: Params) => {
    return execute(0, ...params);
  };

  const abort = () => {
    cancelPending?.();
    cancelPending = undefined;
    isLoading.value = false;
  };

  if (immediate)
    execute();

  const shell = {
    state: state as Shallow extends true ? ShallowRef<Data> : Ref<UnwrapRef<Data>>,
    isLoading,
    isReady,
    error,
    execute,
    executeImmediately,
    abort,
  };

  function waitResolve() {
    return new Promise<UseAsyncStateReturnBase<Data, Params, Shallow>>((resolve, reject) => {
      const unwatch = watch(
        isLoading,
        (loading) => {
          if (loading === false) {
            unwatch();

            if (error.value)
              reject(error.value);
            else 
              resolve(shell);
          }
        },
        { 
          immediate: true,
          flush: 'sync',
        },
      );
    });
  }

  return {
    ...shell,
    // eslint-disable-next-line unicorn/no-thenable
    then(onFulfilled, onRejected) {
      return waitResolve().then(onFulfilled, onRejected);
    },
  }
}
