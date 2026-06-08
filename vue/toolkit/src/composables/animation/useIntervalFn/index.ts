import { readonly, ref, toValue, watch } from 'vue';
import type { MaybeRefOrGetter, Ref } from 'vue';
import type { ResumableActions, ResumableOptions } from '@/types';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

export interface UseIntervalFnOptions extends ResumableOptions {
  /**
   * Whether to invoke the callback immediately on start.
   *
   * @default false
   */
  immediateCallback?: boolean;
}

export interface UseIntervalFnReturn extends ResumableActions {
  /**
   * Whether the interval is currently active
   */
  isActive: Readonly<Ref<boolean>>;
}

/**
 * Call a function on every interval. Supports reactive interval duration,
 * pause/resume, and automatic cleanup on scope dispose.
 *
 * @param callback - Function to call on every interval tick
 * @param interval - Interval duration in milliseconds (can be reactive)
 * @param options - Configuration options
 *
 * @example
 * ```ts
 * const { pause, resume, isActive } = useIntervalFn(() => {
 *   console.log('tick');
 * }, 1000);
 * ```
 *
 * @example
 * ```ts
 * // Reactive interval
 * const delay = ref(1000);
 * useIntervalFn(() => console.log('tick'), delay);
 * delay.value = 500; // interval restarts with new duration
 * ```
 */
export function useIntervalFn(
  callback: () => void,
  interval: MaybeRefOrGetter<number> = 1000,
  options: UseIntervalFnOptions = {},
): UseIntervalFnReturn {
  const {
    immediate = true,
    immediateCallback = false,
  } = options;

  const isActive = ref(false);

  let timerId: ReturnType<typeof setInterval> | null = null;

  function clean() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function resume() {
    const ms = toValue(interval);

    if (ms <= 0)
      return;

    isActive.value = true;

    if (immediateCallback)
      callback();

    clean();
    timerId = setInterval(callback, ms);
  }

  function pause() {
    isActive.value = false;
    clean();
  }

  function toggle() {
    if (isActive.value)
      pause();
    else
      resume();
  }

  // Re-start when interval changes reactively
  watch(() => toValue(interval), () => {
    if (isActive.value) {
      clean();
      resume();
    }
  });

  if (immediate)
    resume();

  tryOnScopeDispose(pause);

  return {
    isActive: readonly(isActive),
    pause,
    resume,
    toggle,
  };
}
