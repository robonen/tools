import type { ShallowRef } from 'vue';
import { shallowRef } from 'vue';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { useEventListener } from '@/composables/browser/useEventListener';

/**
 * @name usePreferredLanguages
 * @category Browser
 * @description Reactive `navigator.languages`. Tracks the user's preferred languages and
 * updates automatically whenever the browser emits a `languagechange` event.
 *
 * Falls back to `['en']` during SSR or when no `window` is available, so the returned
 * value is always a non-empty array.
 *
 * @param {ConfigurableWindow} [options={}] Options
 * @returns {ShallowRef<readonly string[]>} Reactive list of the user's preferred languages
 *
 * @example
 * const languages = usePreferredLanguages();
 * // -> ['en-US', 'en', 'fr']
 *
 * @example
 * // Pass a custom window (e.g. an iframe)
 * const languages = usePreferredLanguages({ window: iframe.contentWindow });
 *
 * @since 0.0.15
 */
export function usePreferredLanguages(options: ConfigurableWindow = {}): ShallowRef<readonly string[]> {
  const { window = defaultWindow } = options;

  if (!window)
    return shallowRef<readonly string[]>(['en']);

  const navigator = window.navigator;
  const value = shallowRef<readonly string[]>(navigator.languages);

  useEventListener(window, 'languagechange', () => {
    value.value = navigator.languages;
  }, { passive: true });

  return value;
}
