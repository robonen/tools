import { computed } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import type { VoidFunction } from '@robonen/stdlib';
import { noop } from '@robonen/stdlib';
import { useTimeoutFn } from '@/composables/animation/useTimeoutFn';
import type { UseTimeoutFnOptions, UseTimeoutFnReturn } from '@/composables/animation/useTimeoutFn';

export interface UseTimeoutOptions<Controls extends boolean> extends UseTimeoutFnOptions {
  /**
   * Expose `start`/`stop` controls alongside the `ready` flag
   *
   * @default false
   */
  controls?: Controls;

  /**
   * Callback invoked when the timeout elapses
   */
  callback?: VoidFunction;
}

export interface UseTimeoutControls {
  /**
   * Reactive flag that is `false` while the timeout is pending and flips to
   * `true` once the delay has elapsed
   */
  ready: ComputedRef<boolean>;

  /**
   * Start (or restart) the timeout
   */
  start: UseTimeoutFnReturn<[]>['start'];

  /**
   * Cancel the pending timeout (leaves `ready` at its current value)
   */
  stop: UseTimeoutFnReturn<[]>['stop'];
}

export type UseTimeoutReturn
  = ComputedRef<boolean> | UseTimeoutControls;

/**
 * @name useTimeout
 * @category Animation
 * @description Reactive boolean that flips to `true` after a given delay.
 * Built on `useTimeoutFn`; optionally exposes `start`/`stop` controls. SSR-safe.
 *
 * @param {MaybeRefOrGetter<number>} [interval=1000] Delay in milliseconds (resolved each time the timeout starts, can be reactive)
 * @param {UseTimeoutOptions} [options={}] Options
 * @returns {ComputedRef<boolean> | UseTimeoutControls} The read-only `ready` flag, or controls when `controls: true`
 *
 * @example
 * const ready = useTimeout(1000);
 * // `ready.value` becomes true after 1s
 *
 * @example
 * const { ready, start, stop } = useTimeout(1000, { controls: true });
 *
 * @example
 * // Run a callback when the timeout elapses
 * useTimeout(5000, { callback: refresh });
 *
 * @since 0.0.15
 */
export function useTimeout(interval?: MaybeRefOrGetter<number>, options?: UseTimeoutOptions<false>): ComputedRef<boolean>;
export function useTimeout(interval: MaybeRefOrGetter<number>, options: UseTimeoutOptions<true>): UseTimeoutControls;
export function useTimeout(
  interval: MaybeRefOrGetter<number> = 1000,
  options: UseTimeoutOptions<boolean> = {},
): UseTimeoutReturn {
  const {
    controls: exposeControls = false,
    callback = noop,
  } = options;

  const { isPending, start, stop } = useTimeoutFn(callback, interval, options);

  const ready = computed(() => !isPending.value);

  if (exposeControls) {
    return {
      ready,
      start,
      stop,
    };
  }

  return ready;
}
