import { computed } from 'vue';
import type { ComputedRef } from 'vue';
import type { ConfigurableWindow } from '@/types';
import { useMediaQuery } from '@/composables/browser/useMediaQuery';

export type ColorSchemePreference = 'dark' | 'light' | 'no-preference';

/**
 * @name usePreferredColorScheme
 * @category Browser
 * @description Reactive `prefers-color-scheme` media query.
 *
 * @param {ConfigurableWindow} [options={}] Options
 * @returns {ComputedRef<ColorSchemePreference>} `'dark'`, `'light'`, or `'no-preference'`
 *
 * @example
 * const scheme = usePreferredColorScheme();
 *
 * @since 0.0.15
 */
export function usePreferredColorScheme(
  options: ConfigurableWindow = {},
): ComputedRef<ColorSchemePreference> {
  const isLight = useMediaQuery('(prefers-color-scheme: light)', options);
  const isDark = useMediaQuery('(prefers-color-scheme: dark)', options);

  return computed(() => {
    if (isDark.value)
      return 'dark';

    if (isLight.value)
      return 'light';

    return 'no-preference';
  });
}
