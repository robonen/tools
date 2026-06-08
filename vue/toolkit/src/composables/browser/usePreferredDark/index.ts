import type { Ref } from 'vue';
import type { ConfigurableWindow } from '@/types';
import { useMediaQuery } from '@/composables/browser/useMediaQuery';

/**
 * @name usePreferredDark
 * @category Browser
 * @description Reactive `prefers-color-scheme: dark` media query.
 *
 * @param {ConfigurableWindow} [options={}] Options
 * @returns {Ref<boolean>} Whether the user prefers a dark color scheme
 *
 * @example
 * const isDark = usePreferredDark();
 *
 * @since 0.0.15
 */
export function usePreferredDark(options: ConfigurableWindow = {}): Ref<boolean> {
  return useMediaQuery('(prefers-color-scheme: dark)', options);
}
