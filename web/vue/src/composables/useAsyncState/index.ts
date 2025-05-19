import { ref, shallowRef } from 'vue';
import { isFunction } from '@robonen/stdlib';

export enum AsyncStateStatus {
  PENDING,
  FULFILLED,
  REJECTED,
}

export interface UseAsyncStateOptions<Shallow extends boolean, Data = any> {
  shallow?: Shallow;
  immediate?: boolean;
  resetOnExecute?: boolean;
  throwError?: boolean;
  onError?: (error: unknown) => void;
  onSuccess?: (data: Data) => void;
}

/**
 * @name useAsyncState
 * @category State
 * @description A composable that provides a state for async operations without setup blocking
 */
export function useAsyncState<Data, Params extends any[] = [], Shallow extends boolean = true>(
  maybePromise: Promise<Data> | ((...args: Params) => Promise<Data>),
  initialState: Data,
  options?: UseAsyncStateOptions<Shallow, Data>,
) {
  const state = options?.shallow ? shallowRef(initialState) : ref(initialState);
  const status = ref<AsyncStateStatus | null>(null);

  const execute = async (...params: any[]) => {
    if (options?.resetOnExecute)
      state.value = initialState;

    status.value = AsyncStateStatus.PENDING;

    const promise = isFunction(maybePromise) ? maybePromise(...params as Params) : maybePromise;

    try {
      const data = await promise;
      state.value = data;
      status.value = AsyncStateStatus.FULFILLED;
      options?.onSuccess?.(data);
    }
    catch (error) {
      status.value = AsyncStateStatus.REJECTED;
      options?.onError?.(error);

      if (options?.throwError)
        throw error;
    }

    return state.value as Data;
  };

  if (options?.immediate)
    execute();
}
