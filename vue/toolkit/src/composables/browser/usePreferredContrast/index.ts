import { computed } from 'vue';
import type { ComputedRef } from 'vue';
import { useMediaQuery } from '@/composables/browser/useMediaQuery';
import type { UseMediaQueryOptions } from '@/composables/browser/useMediaQuery';

export type ContrastType
  = 'more' | 'less' | 'custom' | 'no-preference';

export interface UsePreferredContrastOptions extends UseMediaQueryOptions {
  /**
   * The contrast preference assumed during SSR (and the first client render),
   * before `window.matchMedia` is available, to avoid hydration flicker.
   *
   * @default 'no-preference'
   */
  ssrContrast?: ContrastType;
}

/**
 * @name usePreferredContrast
 * @category Browser
 * @description Reactive `prefers-contrast` media query, resolving to the user's
 * preferred contrast level. SSR-safe with an optional SSR fallback value.
 *
 * @param {UsePreferredContrastOptions} [options={}] Options (custom `window`, `ssrContrast`)
 * @returns {ComputedRef<ContrastType>} Readonly ref of the preferred contrast: `'more' | 'less' | 'custom' | 'no-preference'`
 *
 * @example
 * const contrast = usePreferredContrast();
 *
 * @example
 * // Provide an SSR fallback to avoid hydration flicker
 * const contrast = usePreferredContrast({ ssrContrast: 'more' });
 *
 * @since 0.0.15
 */
export function usePreferredContrast(
  options: UsePreferredContrastOptions = {},
): ComputedRef<ContrastType> {
  const { ssrContrast = 'no-preference', ...mediaOptions } = options;

  const isMore = useMediaQuery('(prefers-contrast: more)', mediaOptions);
  const isLess = useMediaQuery('(prefers-contrast: less)', mediaOptions);
  const isCustom = useMediaQuery('(prefers-contrast: custom)', mediaOptions);
  const isNoPreference = useMediaQuery('(prefers-contrast: no-preference)', mediaOptions);

  return computed<ContrastType>(() => {
    if (isMore.value)
      return 'more';
    if (isLess.value)
      return 'less';
    if (isCustom.value)
      return 'custom';
    // When no `prefers-contrast` query matches we're either on a browser that
    // does not report a preference, or rendering on the server. Distinguish the
    // explicit `no-preference` match from the unknown/SSR case via the fallback.
    if (isNoPreference.value)
      return 'no-preference';
    return ssrContrast;
  });
}
