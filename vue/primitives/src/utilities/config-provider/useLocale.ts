import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import { computed, toValue } from 'vue';
import { useConfig } from './context';

/**
 * Resolves the effective locale: a per-component override wins over the active
 * `ConfigProvider` `locale`, falling back to `'en'`. Lets date/calendar
 * primitives inherit a single app-wide locale instead of repeating it per
 * instance.
 *
 * @param locale Optional per-component locale override.
 * @returns A computed locale string combining the override with the config.
 */
export function useLocale(
  locale?: MaybeRefOrGetter<string | undefined>,
): ComputedRef<string> {
  const config = useConfig();
  return computed(() => toValue(locale) || config.locale.value || 'en');
}
