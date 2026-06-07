import { shallowReadonly, shallowRef } from 'vue';
import type { MaybeRefOrGetter, ShallowRef } from 'vue';
import type { ResumableActions } from '@/types';
import { useIntervalFn } from '@/composables/browser/useIntervalFn';
import type { UseIntervalFnReturn } from '@/composables/browser/useIntervalFn';

export interface UseIntervalOptions<Controls extends boolean> {
  /**
   * Expose pause/resume controls alongside the counter
   *
   * @default false
   */
  controls?: Controls;

  /**
   * Start the interval immediately
   *
   * @default true
   */
  immediate?: boolean;

  /**
   * Callback invoked on every tick with the current counter value
   */
  callback?: (count: number) => void;
}

export interface UseIntervalControls extends ResumableActions {
  /**
   * The current counter value (read-only; use `reset` to set it back to 0)
   */
  counter: Readonly<ShallowRef<number>>;

  /**
   * Whether the interval is currently active
   */
  isActive: UseIntervalFnReturn['isActive'];

  /**
   * Reset the counter back to 0
   */
  reset: () => void;
}

export type UseIntervalReturn = Readonly<ShallowRef<number>> | UseIntervalControls;

/**
 * @name useInterval
 * @category Utilities
 * @description Reactive counter that increments on every interval tick.
 *
 * @param {MaybeRefOrGetter<number>} [interval=1000] Interval in milliseconds (can be reactive)
 * @param {UseIntervalOptions} [options={}] Options
 * @returns {Readonly<ShallowRef<number>> | UseIntervalControls} The read-only counter, or controls when `controls: true`
 *
 * @example
 * const counter = useInterval(1000);
 *
 * @example
 * const { counter, isActive, pause, resume, reset } = useInterval(1000, { controls: true });
 *
 * @since 0.0.15
 */
export function useInterval(interval?: MaybeRefOrGetter<number>, options?: UseIntervalOptions<false>): Readonly<ShallowRef<number>>;
export function useInterval(interval: MaybeRefOrGetter<number>, options: UseIntervalOptions<true>): UseIntervalControls;
export function useInterval(
  interval: MaybeRefOrGetter<number> = 1000,
  options: UseIntervalOptions<boolean> = {},
): UseIntervalReturn {
  const {
    controls = false,
    immediate = true,
    callback,
  } = options;

  const counter = shallowRef(0);
  const reset = (): void => {
    counter.value = 0;
  };

  const update = callback
    ? () => callback(++counter.value)
    : () => void counter.value++;

  const intervalControls = useIntervalFn(update, interval, { immediate });

  if (controls) {
    return {
      counter: shallowReadonly(counter),
      reset,
      ...intervalControls,
    };
  }

  return shallowReadonly(counter);
}
