import { readonly, ref, toValue } from 'vue';
import type { MaybeRefOrGetter, Ref } from 'vue';
import type { AnyFunction } from '@robonen/stdlib';
import { isClient } from '@robonen/platform/multi';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

export interface UseTimeoutFnOptions {
  /**
   * Start the timeout immediately when the composable is created
   *
   * @default true
   */
  immediate?: boolean;

  /**
   * Invoke the callback synchronously the moment `start` is called,
   * in addition to the scheduled invocation after the delay elapses
   *
   * @default false
   */
  immediateCallback?: boolean;
}

export interface UseTimeoutFnReturn<Args extends any[]> {
  /**
   * Whether the timeout is currently pending
   */
  isPending: Readonly<Ref<boolean>>;

  /**
   * Start (or restart) the timeout
   */
  start: (...args: Args) => void;

  /**
   * Cancel the pending timeout
   */
  stop: () => void;
}

/**
 * @name useTimeoutFn
 * @category Animation
 * @description Call a function after a given delay, with manual `start`/`stop`
 * control and a reactive `isPending` flag. SSR-safe and cleans up on scope dispose.
 *
 * @param {T} cb The function to call after the timeout
 * @param {MaybeRefOrGetter<number>} interval Delay in milliseconds (resolved each time `start` runs, can be reactive)
 * @param {UseTimeoutFnOptions} [options={}] Options
 * @returns {UseTimeoutFnReturn} Timeout controls
 *
 * @example
 * const { isPending, start, stop } = useTimeoutFn(() => {
 *   console.log('fired');
 * }, 1000);
 *
 * @example
 * // Fire once now and again after the delay
 * useTimeoutFn(refresh, 5000, { immediateCallback: true });
 *
 * @since 0.0.15
 */
export function useTimeoutFn<T extends AnyFunction>(
  cb: T,
  interval: MaybeRefOrGetter<number>,
  options: UseTimeoutFnOptions = {},
): UseTimeoutFnReturn<Parameters<T>> {
  const {
    immediate = true,
    immediateCallback = false,
  } = options;

  const isPending = ref(false);

  let timer: ReturnType<typeof setTimeout> | null = null;

  function clear() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function stop() {
    isPending.value = false;
    clear();
  }

  function start(...args: Parameters<T>) {
    if (immediateCallback)
      cb(...args);

    clear();
    isPending.value = true;

    timer = setTimeout(() => {
      isPending.value = false;
      timer = null;
      cb(...args);
    }, toValue(interval));
  }

  if (immediate) {
    isPending.value = true;

    if (isClient)
      start(...([] as unknown as Parameters<T>));
  }

  tryOnScopeDispose(stop);

  return {
    isPending: readonly(isPending),
    start,
    stop,
  };
}
