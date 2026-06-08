import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import { isFunction, isNumber } from '@robonen/stdlib';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { useMediaQuery } from '@/composables/browser/useMediaQuery';
import type { UseMediaQueryOptions } from '@/composables/browser/useMediaQuery';

/**
 * A breakpoints map: name → viewport width. Numbers are treated as pixels;
 * strings keep their unit (`"48em"`, `"30rem"`, `"1024px"`). Values may be
 * reactive (refs or getters).
 */
export type Breakpoints<K extends string = string>
  = Record<K, MaybeRefOrGetter<number | string>>;

/**
 * Which edge a generated shortcut property (e.g. `breakpoints.lg`) reacts to.
 *
 * - `'min-width'` (mobile-first) — `lg` is `true` when the viewport is at least
 *   the `lg` width.
 * - `'max-width'` (desktop-first) — `lg` is `true` when the viewport is at most
 *   the `lg` width.
 */
export type UseBreakpointsStrategy = 'min-width' | 'max-width';

export interface UseBreakpointsOptions extends ConfigurableWindow, Pick<UseMediaQueryOptions, 'ssrWidth'> {
  /**
   * The query strategy used by the generated shortcut properties.
   *
   * @default 'min-width'
   */
  strategy?: UseBreakpointsStrategy;
}

export type UseBreakpointsReturn<K extends string = string>
  = Record<K, ComputedRef<boolean>> & {
    /** Reactive: viewport width is greater than or equal to breakpoint `k` (`min-width`). */
    greaterOrEqual: (k: MaybeRefOrGetter<K>) => ComputedRef<boolean>;
    /** Reactive: viewport width is smaller than or equal to breakpoint `k` (`max-width`). */
    smallerOrEqual: (k: MaybeRefOrGetter<K>) => ComputedRef<boolean>;
    /** Reactive: viewport width is strictly greater than breakpoint `k`. */
    greater: (k: MaybeRefOrGetter<K>) => ComputedRef<boolean>;
    /** Reactive: viewport width is strictly smaller than breakpoint `k`. */
    smaller: (k: MaybeRefOrGetter<K>) => ComputedRef<boolean>;
    /** Reactive: viewport width is within `[a, b)`. */
    between: (a: MaybeRefOrGetter<K>, b: MaybeRefOrGetter<K>) => ComputedRef<boolean>;
    /** Snapshot: viewport width is strictly greater than breakpoint `k`. */
    isGreater: (k: MaybeRefOrGetter<K>) => boolean;
    /** Snapshot: viewport width is greater than or equal to breakpoint `k`. */
    isGreaterOrEqual: (k: MaybeRefOrGetter<K>) => boolean;
    /** Snapshot: viewport width is strictly smaller than breakpoint `k`. */
    isSmaller: (k: MaybeRefOrGetter<K>) => boolean;
    /** Snapshot: viewport width is smaller than or equal to breakpoint `k`. */
    isSmallerOrEqual: (k: MaybeRefOrGetter<K>) => boolean;
    /** Snapshot: viewport width is within `[a, b)`. */
    isInBetween: (a: MaybeRefOrGetter<K>, b: MaybeRefOrGetter<K>) => boolean;
    /** Reactive: all currently active breakpoints, ordered small → large. */
    current: () => ComputedRef<K[]>;
    /** Reactive: the single active breakpoint per `strategy` (largest for `min-width`, smallest for `max-width`), or `''` when none. */
    active: () => ComputedRef<K | ''>;
  };

/**
 * Parse a CSS length token (`"1024px"`, `"48em"`, `"30rem"`, `"50%"`) into a
 * pixel number. `em`/`rem` use the conventional 16px root size.
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
 * Add `delta` to the numeric portion of a CSS length, preserving its unit.
 * Used to build the strict (`> / <`) variants from inclusive media queries via
 * a small ±0.1 nudge.
 */
function increaseWithUnit(target: number | string, delta: number): number | string {
  if (isNumber(target))
    return target + delta;

  const value = target.match(/^-?\d+(?:\.\d+)?/)?.[0] ?? '';
  const unit = target.slice(value.length);
  const result = Number.parseFloat(value) + delta;

  if (Number.isNaN(result))
    return target;

  return result + unit;
}

/**
 * @name useBreakpoints
 * @category Browser
 * @description Reactive viewport breakpoints derived from a breakpoints map.
 * SSR-safe (resolves width queries from `ssrWidth` before `matchMedia` exists),
 * reactive to breakpoint values, and built on a single `useMediaQuery` per
 * comparison. Comes with presets: `breakpointsTailwind`, `breakpointsBootstrapV5`,
 * `breakpointsAntDesign`, `breakpointsVuetifyV3`.
 *
 * @param {Breakpoints<K>} breakpoints The breakpoints map (`name → width`)
 * @param {UseBreakpointsOptions} [options={}] Options (`strategy`, custom `window`, `ssrWidth`)
 * @returns {UseBreakpointsReturn<K>} Shortcut refs per breakpoint plus comparison helpers
 *
 * @example
 * const bp = useBreakpoints(breakpointsTailwind);
 * const isDesktop = bp.greaterOrEqual('lg');
 * const isMobile = bp.smaller('md');
 * bp.lg; // ComputedRef<boolean> — true when viewport >= 1024px
 *
 * @example
 * const bp = useBreakpoints({ mobile: 0, tablet: 640, desktop: 1024 });
 * const active = bp.active(); // ComputedRef<'mobile' | 'tablet' | 'desktop' | ''>
 *
 * @since 0.0.15
 */
export function useBreakpoints<K extends string>(
  breakpoints: Breakpoints<K>,
  options: UseBreakpointsOptions = {},
): UseBreakpointsReturn<K> {
  const { window = defaultWindow, strategy = 'min-width', ssrWidth } = options;
  const mediaOptions: UseMediaQueryOptions = { window, ssrWidth };
  const ssrSupport = isNumber(ssrWidth);

  function getValue(k: MaybeRefOrGetter<K>, delta?: number): string {
    let v = toValue(breakpoints[toValue(k)]);

    if (delta !== undefined)
      v = increaseWithUnit(v, delta);

    return isNumber(v) ? `${v}px` : v;
  }

  // Synchronous (non-reactive) match for the `is*` snapshot helpers.
  function match(edge: 'min' | 'max', size: string): boolean {
    const supported = window && isFunction(window.matchMedia);

    if (!supported)
      return ssrSupport
        ? (edge === 'min' ? ssrWidth >= pxValue(size) : ssrWidth <= pxValue(size))
        : false;

    return window.matchMedia(`(${edge}-width: ${size})`).matches;
  }

  const greaterOrEqual = (k: MaybeRefOrGetter<K>): ComputedRef<boolean> =>
    useMediaQuery(() => `(min-width: ${getValue(k)})`, mediaOptions);

  const smallerOrEqual = (k: MaybeRefOrGetter<K>): ComputedRef<boolean> =>
    useMediaQuery(() => `(max-width: ${getValue(k)})`, mediaOptions);

  const greater = (k: MaybeRefOrGetter<K>): ComputedRef<boolean> =>
    useMediaQuery(() => `(min-width: ${getValue(k, 0.1)})`, mediaOptions);

  const smaller = (k: MaybeRefOrGetter<K>): ComputedRef<boolean> =>
    useMediaQuery(() => `(max-width: ${getValue(k, -0.1)})`, mediaOptions);

  const between = (a: MaybeRefOrGetter<K>, b: MaybeRefOrGetter<K>): ComputedRef<boolean> =>
    useMediaQuery(() => `(min-width: ${getValue(a)}) and (max-width: ${getValue(b, -0.1)})`, mediaOptions);

  const keys = Object.keys(breakpoints) as K[];

  // Generated shortcut properties (`bp.lg`). Lazily created getters so we only
  // spin up a `useMediaQuery` watcher for the breakpoints actually accessed.
  const shortcuts = keys.reduce((acc, k) => {
    Object.defineProperty(acc, k, {
      get: () => strategy === 'min-width' ? greaterOrEqual(k) : smallerOrEqual(k),
      enumerable: true,
      configurable: true,
    });

    return acc;
  }, {} as Record<K, ComputedRef<boolean>>);

  function current(): ComputedRef<K[]> {
    const points = keys
      .map(k => [k, shortcuts[k], pxValue(getValue(k))] as const)
      .sort((a, b) => a[2] - b[2]);

    return computed(() => points.filter(([, matches]) => matches.value).map(([k]) => k));
  }

  return Object.assign(shortcuts, {
    greaterOrEqual,
    smallerOrEqual,
    greater,
    smaller,
    between,
    isGreater: (k: MaybeRefOrGetter<K>): boolean => match('min', getValue(k, 0.1)),
    isGreaterOrEqual: (k: MaybeRefOrGetter<K>): boolean => match('min', getValue(k)),
    isSmaller: (k: MaybeRefOrGetter<K>): boolean => match('max', getValue(k, -0.1)),
    isSmallerOrEqual: (k: MaybeRefOrGetter<K>): boolean => match('max', getValue(k)),
    isInBetween: (a: MaybeRefOrGetter<K>, b: MaybeRefOrGetter<K>): boolean =>
      match('min', getValue(a)) && match('max', getValue(b, -0.1)),
    current,
    active(): ComputedRef<K | ''> {
      const bps = current();

      return computed(() => bps.value.length === 0
        ? ''
        : bps.value.at(strategy === 'min-width' ? -1 : 0)!);
    },
  });
}

/**
 * Tailwind CSS default breakpoints.
 *
 * @see https://tailwindcss.com/docs/responsive-design
 */
export const breakpointsTailwind = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

/**
 * Bootstrap v5 default breakpoints.
 *
 * @see https://getbootstrap.com/docs/5.0/layout/breakpoints/
 */
export const breakpointsBootstrapV5 = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400,
};

/**
 * Ant Design default breakpoints.
 *
 * @see https://ant.design/components/grid#col
 */
export const breakpointsAntDesign = {
  xs: 480,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1600,
};

/**
 * Vuetify v3 default breakpoints.
 *
 * @see https://vuetifyjs.com/en/features/display-and-platform/
 */
export const breakpointsVuetifyV3 = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920,
  xxl: 2560,
};
