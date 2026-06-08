import { computed } from 'vue';
import type { ComputedRef } from 'vue';
import type { ConfigurableWindow } from '@/types';
import { useMediaQuery } from '@/composables/browser/useMediaQuery';

export type ReducedTransparencyType
  = 'reduce' | 'no-preference';

/**
 * @name usePreferredReducedTransparency
 * @category Browser
 * @description Reactive `prefers-reduced-transparency` media query, resolving to
 * `'reduce'` or `'no-preference'`. SSR-safe (defaults to `'no-preference'`).
 *
 * @param {ConfigurableWindow} [options={}] Options (custom `window`)
 * @returns {ComputedRef<ReducedTransparencyType>} Readonly ref of the user's transparency preference
 *
 * @example
 * const transparency = usePreferredReducedTransparency();
 * // transparency.value === 'reduce' | 'no-preference'
 *
 * @since 0.0.15
 */
export function usePreferredReducedTransparency(
  options: ConfigurableWindow = {},
): ComputedRef<ReducedTransparencyType> {
  const isReduced = useMediaQuery('(prefers-reduced-transparency: reduce)', options);

  return computed<ReducedTransparencyType>(() => isReduced.value ? 'reduce' : 'no-preference');
}
