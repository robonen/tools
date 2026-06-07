import { computed, shallowRef, toValue, watchEffect } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import { isFunction, isNumber } from '@robonen/stdlib';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { useSupported } from '@/composables/browser/useSupported';
import { useEventListener } from '@/composables/browser/useEventListener';

export interface UseMediaQueryOptions extends ConfigurableWindow {
  /**
   * The viewport width (in pixels) assumed during SSR, used to resolve
   * `min-width` / `max-width` queries before `window.matchMedia` is available.
   *
   * When provided, the composable returns a best-effort match on the server
   * (and the first client render) instead of always `false`, avoiding hydration
   * flicker for width-based queries. Ignored once `matchMedia` is supported.
   *
   * @default undefined
   */
  ssrWidth?: number;
}

/**
 * Convert a CSS length token (e.g. `"1024px"`, `"48em"`, `"30rem"`) to pixels.
 * Falls back to treating `em`/`rem` as the conventional 16px root size.
 */
function pxValue(value: string): number {
  const number = Number.parseFloat(value);

  if (Number.isNaN(number))
    return Number.NaN;

  if (/(?:em|rem)\s*$/i.test(value))
    return number * 16;

  return number;
}

/**
 * Best-effort evaluation of `min-width` / `max-width` media queries against a
 * known viewport width, for SSR. Comma-separated queries are OR-combined and
 * `not all` negation is respected. Returns `false` for queries we can't resolve.
 */
function matchSsrWidth(query: string, width: number): boolean {
  return query.split(',').some((part) => {
    const not = part.includes('not all');
    const minWidth = part.match(/\(\s*min-width:\s*(-?\d+(?:\.\d*)?[a-z%]+\s*)\)/);
    const maxWidth = part.match(/\(\s*max-width:\s*(-?\d+(?:\.\d*)?[a-z%]+\s*)\)/);

    let result = Boolean(minWidth || maxWidth);

    if (minWidth && result)
      result = width >= pxValue(minWidth[1]!);

    if (maxWidth && result)
      result = width <= pxValue(maxWidth[1]!);

    return not ? !result : result;
  });
}

/**
 * @name useMediaQuery
 * @category Browser
 * @description Reactive `window.matchMedia`. SSR-safe, reactive to the query, and
 * with optional SSR width resolution for `min-width` / `max-width` queries.
 *
 * @param {MaybeRefOrGetter<string>} query The media query (can be reactive)
 * @param {UseMediaQueryOptions} [options={}] Options (custom `window`, `ssrWidth`)
 * @returns {ComputedRef<boolean>} Readonly ref of whether the query currently matches
 *
 * @example
 * const isLarge = useMediaQuery('(min-width: 1024px)');
 *
 * @example
 * // Resolve width queries during SSR to avoid hydration flicker
 * const isWide = useMediaQuery('(min-width: 1024px)', { ssrWidth: 1280 });
 *
 * @since 0.0.15
 */
export function useMediaQuery(
  query: MaybeRefOrGetter<string>,
  options: UseMediaQueryOptions = {},
): ComputedRef<boolean> {
  const { window = defaultWindow, ssrWidth } = options;

  const isSupported = useSupported(() =>
    window && 'matchMedia' in window && isFunction(window.matchMedia));

  const ssrSupport = shallowRef(isNumber(ssrWidth));

  const mediaQuery = shallowRef<MediaQueryList | undefined>();
  const matches = shallowRef(false);

  const handler = (event: MediaQueryListEvent) => {
    matches.value = event.matches;
  };

  watchEffect(() => {
    // Resolve width-based queries from `ssrWidth` until the real API is ready.
    if (ssrSupport.value) {
      ssrSupport.value = !isSupported.value;
      matches.value = matchSsrWidth(toValue(query), ssrWidth!);
      return;
    }

    if (!isSupported.value)
      return;

    mediaQuery.value = window!.matchMedia(toValue(query));
    matches.value = mediaQuery.value.matches;
  });

  // Reactive target: re-binds automatically when the query (and thus the
  // MediaQueryList) changes, and auto-cleans on scope dispose. Passive since
  // we never call preventDefault.
  useEventListener(mediaQuery, 'change', handler, { passive: true });

  return computed(() => matches.value);
}
