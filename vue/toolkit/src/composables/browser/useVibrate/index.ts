import { toRef } from 'vue';
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';
import type { Arrayable } from '@robonen/stdlib';
import type { ConfigurableNavigator } from '@/types';
import { defaultNavigator } from '@/types';
import { useSupported } from '@/composables/browser/useSupported';
import { useIntervalFn } from '@/composables/browser/useIntervalFn';
import type { UseIntervalFnReturn } from '@/composables/browser/useIntervalFn';

export interface UseVibrateOptions extends ConfigurableNavigator {
  /**
   * The pattern of vibrations and pauses (in milliseconds).
   *
   * A single number vibrates for that many milliseconds; an array alternates
   * between vibration and pause durations.
   *
   * @default []
   */
  pattern?: MaybeRefOrGetter<Arrayable<number>>;

  /**
   * Interval (in milliseconds) to automatically run the vibration pattern on a loop.
   *
   * When greater than `0`, an `intervalControls` object is returned so the loop can
   * be paused/resumed. The loop does not start automatically; call `vibrate()` once
   * or use `intervalControls.resume()`.
   *
   * @default 0
   */
  interval?: number;
}

export interface UseVibrateReturn {
  /**
   * Whether the Vibration API is supported in the current environment.
   */
  isSupported: ComputedRef<boolean>;

  /**
   * The reactive vibration pattern. Mutating it changes what `vibrate()` plays by default.
   */
  pattern: Ref<Arrayable<number>>;

  /**
   * Pause/resume controls for the interval loop. Only present when `interval > 0`.
   */
  intervalControls?: UseIntervalFnReturn;

  /**
   * Trigger a vibration. Falls back to the configured `pattern` when called without arguments.
   *
   * @param pattern - Optional one-off pattern to play instead of the configured one
   */
  vibrate: (pattern?: Arrayable<number>) => void;

  /**
   * Stop any ongoing vibration and pause the interval loop (if any).
   */
  stop: () => void;
}

/**
 * @name useVibrate
 * @category Browser
 * @description Reactive wrapper around the `navigator.vibrate` Vibration API.
 *
 * @param {UseVibrateOptions} [options] Configuration options
 * @returns {UseVibrateReturn} Support flag, reactive pattern, vibrate/stop actions, and optional interval controls
 *
 * @example
 * const { vibrate, stop, isSupported } = useVibrate({ pattern: [200, 100, 200] });
 * vibrate();
 *
 * @example
 * // Loop a pattern on an interval
 * const { vibrate, stop, intervalControls } = useVibrate({ pattern: [300, 100], interval: 2000 });
 * intervalControls?.resume();
 *
 * @since 0.0.15
 */
export function useVibrate(options: UseVibrateOptions = {}): UseVibrateReturn {
  const {
    pattern = [],
    interval = 0,
    navigator = defaultNavigator,
  } = options;

  const isSupported = useSupported(() => typeof navigator !== 'undefined' && !!navigator && 'vibrate' in navigator);

  const patternRef = toRef(pattern);

  function vibrate(pattern: Arrayable<number> = patternRef.value): void {
    if (isSupported.value)
      navigator!.vibrate(pattern);
  }

  const intervalControls: UseIntervalFnReturn | undefined = interval > 0
    ? useIntervalFn(vibrate, interval, { immediate: false })
    : undefined;

  function stop(): void {
    if (isSupported.value)
      navigator!.vibrate(0);

    intervalControls?.pause();
  }

  return {
    isSupported,
    pattern: patternRef,
    intervalControls,
    vibrate,
    stop,
  };
}
