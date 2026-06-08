import { shallowReadonly, shallowRef, toValue } from 'vue';
import type { MaybeRefOrGetter, ShallowRef } from 'vue';
import type { ResumableActions } from '@/types';
import { useIntervalFn } from '@/composables/animation/useIntervalFn';
import type { UseIntervalFnReturn } from '@/composables/animation/useIntervalFn';

export interface UseCountdownOptions {
  /**
   * Tick interval in milliseconds. Each tick decrements `remaining` by one.
   *
   * @default 1000
   */
  interval?: MaybeRefOrGetter<number>;

  /**
   * Start the countdown immediately when the composable is created
   *
   * @default false
   */
  immediate?: boolean;

  /**
   * Callback invoked on every tick with the current remaining value
   */
  onTick?: (remaining: number) => void;

  /**
   * Callback invoked once when the countdown reaches zero
   */
  onComplete?: () => void;
}

export interface UseCountdownReturn extends ResumableActions {
  /**
   * The remaining seconds, read-only (use `reset`/`start` to change it)
   */
  remaining: Readonly<ShallowRef<number>>;

  /**
   * Whether the countdown is currently running
   */
  isActive: UseIntervalFnReturn['isActive'];

  /**
   * Reset `remaining` (defaults to the initial value) without changing the
   * running state
   */
  reset: (countdown?: MaybeRefOrGetter<number>) => void;

  /**
   * Pause the countdown and reset `remaining` to the initial value
   */
  stop: () => void;

  /**
   * Reset `remaining` (defaults to the initial value) and start counting down
   */
  start: (countdown?: MaybeRefOrGetter<number>) => void;
}

/**
 * @name useCountdown
 * @category Animation
 * @description Reactive countdown timer exposing the remaining seconds plus
 * `start`/`stop`/`pause`/`resume`/`reset` controls and `onTick`/`onComplete`
 * callbacks. Built on `useIntervalFn`, so it is SSR-safe and cleans up on scope
 * dispose.
 *
 * @param {MaybeRefOrGetter<number>} initialCountdown The starting value, in seconds (can be reactive)
 * @param {UseCountdownOptions} [options={}] Options
 * @returns {UseCountdownReturn} The reactive remaining value and countdown controls
 *
 * @example
 * const { remaining, start, pause, resume, stop } = useCountdown(60);
 * start();
 *
 * @example
 * useCountdown(10, {
 *   immediate: true,
 *   onTick: (n) => console.log(n),
 *   onComplete: () => console.log('done'),
 * });
 *
 * @since 0.0.15
 */
export function useCountdown(
  initialCountdown: MaybeRefOrGetter<number>,
  options: UseCountdownOptions = {},
): UseCountdownReturn {
  const {
    interval = 1000,
    immediate = false,
    onTick,
    onComplete,
  } = options;

  const remaining = shallowRef(toValue(initialCountdown));

  const controls = useIntervalFn(() => {
    const next = remaining.value - 1;
    remaining.value = next < 0 ? 0 : next;

    onTick?.(remaining.value);

    if (remaining.value <= 0) {
      controls.pause();
      onComplete?.();
    }
  }, interval, { immediate });

  const reset = (countdown?: MaybeRefOrGetter<number>): void => {
    remaining.value = toValue(countdown) ?? toValue(initialCountdown);
  };

  const stop = (): void => {
    controls.pause();
    reset();
  };

  const resume = (): void => {
    if (!controls.isActive.value && remaining.value > 0)
      controls.resume();
  };

  const start = (countdown?: MaybeRefOrGetter<number>): void => {
    reset(countdown);
    controls.resume();
  };

  const toggle = (): void => {
    if (controls.isActive.value)
      controls.pause();
    else
      resume();
  };

  return {
    remaining: shallowReadonly(remaining),
    isActive: controls.isActive,
    reset,
    stop,
    start,
    pause: controls.pause,
    resume,
    toggle,
  };
}
