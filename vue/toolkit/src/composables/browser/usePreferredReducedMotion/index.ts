import { computed } from 'vue';
import type { ComputedRef } from 'vue';
import { useMediaQuery } from '@/composables/browser/useMediaQuery';
import type { UseMediaQueryOptions } from '@/composables/browser/useMediaQuery';

export type ReducedMotionType
  = | 'reduce'
    | 'no-preference';

export type UsePreferredReducedMotionOptions = UseMediaQueryOptions;

export type UsePreferredReducedMotionReturn = ComputedRef<ReducedMotionType>;

/**
 * @name usePreferredReducedMotion
 * @category Browser
 * @description Reactive `prefers-reduced-motion` media query, resolving to
 * `'reduce'` when the user requests reduced motion and `'no-preference'`
 * otherwise. SSR-safe via {@link useMediaQuery}.
 *
 * @param {UsePreferredReducedMotionOptions} [options={}] Options (custom `window`)
 * @returns {UsePreferredReducedMotionReturn} Readonly ref of the current motion preference
 *
 * @example
 * const motion = usePreferredReducedMotion();
 * // motion.value === 'reduce' | 'no-preference'
 *
 * @example
 * watchEffect(() => {
 *   transitionDuration.value = motion.value === 'reduce' ? 0 : 200;
 * });
 *
 * @since 0.0.15
 */
export function usePreferredReducedMotion(
  options: UsePreferredReducedMotionOptions = {},
): UsePreferredReducedMotionReturn {
  const isReduced = useMediaQuery('(prefers-reduced-motion: reduce)', options);

  return computed<ReducedMotionType>(() => isReduced.value ? 'reduce' : 'no-preference');
}
