import { ref, shallowRef, watch, type Ref, type ShallowRef, type UnwrapRef } from 'vue';
import { isFunction, sleep } from '@robonen/stdlib';

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

  const execute = async (actualDelay = delay, ...params: any[]) => {
    if (resetOnExecute)
      state.value = initialState;

    isLoading.value = true;
    isReady.value = false;
    error.value = null;

    if (actualDelay > 0)
      await sleep(actualDelay);

    const promise = isFunction(maybePromise) ? maybePromise(...params as Params) : maybePromise;

    try {
      const data = await promise;
      state.value = data;
      isReady.value = true;
      onSuccess?.(data);
    }
    catch (e: unknown) {
      error.value = e;
      onError?.(e);

      if (throwError)
        throw e;
    }
    finally {
      isLoading.value = false;
    }

    return state.value as Data;
  };

  const executeImmediately = (...params: Params) => {
    return execute(0, ...params);
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
  };

  function waitResolve() {
    return new Promise<UseAsyncStateReturnBase<Data, Params, Shallow>>((resolve, reject) => {
      watch(
        isLoading,
        (loading) => {
          if (loading === false)
            error.value ? reject(error.value) : resolve(shell);
        },
        { 
          immediate: true,
          once: true,
          flush: 'sync',
        },
      );
    });
  }

  return {
    ...shell,
    then(onFulfilled, onRejected) {
      return waitResolve().then(onFulfilled, onRejected);
    },
  }
}
