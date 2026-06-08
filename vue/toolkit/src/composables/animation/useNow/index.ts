import { shallowRef } from 'vue';
import type { Ref } from 'vue';
import type { ResumableActions } from '@/types';
import { useRafFn } from '@/composables/animation/useRafFn';
import { useIntervalFn } from '@/composables/animation/useIntervalFn';

export interface UseNowOptions<Controls extends boolean> {
  /**
   * Expose pause/resume controls alongside the date
   *
   * @default false
   */
  controls?: Controls;

  /**
   * Start updating immediately
   *
   * @default true
   */
  immediate?: boolean;

  /**
   * Update strategy. `'requestAnimationFrame'` updates every frame; a number
   * updates on a fixed interval (ms).
   *
   * @default 'requestAnimationFrame'
   */
  interval?: 'requestAnimationFrame' | number;

  /**
   * Callback invoked on every update with the current date
   */
  callback?: (now: Date) => void;
}

/**
 * Pause/resume controls returned when `controls: true`.
 */
export interface UseNowControls extends ResumableActions {
  /**
   * The reactive current date
   */
  now: Ref<Date>;

  /**
   * Whether the updater (RAF loop or interval) is currently active
   */
  isActive: Readonly<Ref<boolean>>;
}

export type UseNowReturn<Controls extends boolean>
  = Controls extends true ? UseNowControls : Ref<Date>;

/**
 * @name useNow
 * @category Animation
 * @description Reactive current `Date`, updated via `requestAnimationFrame`
 * or a fixed interval.
 *
 * @param {UseNowOptions} [options={}] Options
 * @returns {Ref<Date> | UseNowControls} The date, or controls when `controls: true`
 *
 * @example
 * const now = useNow();
 *
 * @example
 * const { now, pause, resume, isActive } = useNow({ controls: true, interval: 1000 });
 *
 * @example
 * // Run a callback on every update
 * useNow({ interval: 1000, callback: date => console.log(date.toISOString()) });
 *
 * @since 0.0.15
 */
export function useNow(options?: UseNowOptions<false>): Ref<Date>;
export function useNow(options: UseNowOptions<true>): UseNowControls;
export function useNow(
  options: UseNowOptions<boolean> = {},
): Ref<Date> | UseNowControls {
  const {
    controls = false,
    immediate = true,
    interval = 'requestAnimationFrame',
    callback,
  } = options;

  const now = shallowRef(new Date());

  const update = callback
    ? () => {
        now.value = new Date();
        callback(now.value);
      }
    : () => {
        now.value = new Date();
      };

  const resumableControls = interval === 'requestAnimationFrame'
    ? useRafFn(update, { immediate })
    : useIntervalFn(update, interval, { immediate });

  if (controls) {
    return {
      now,
      ...resumableControls,
    };
  }

  return now;
}
