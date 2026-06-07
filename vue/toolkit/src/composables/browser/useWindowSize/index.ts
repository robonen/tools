import { shallowRef, watch } from 'vue';
import type { ShallowRef } from 'vue';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { useEventListener } from '@/composables/browser/useEventListener';
import { useMediaQuery } from '@/composables/browser/useMediaQuery';
import { tryOnMounted } from '@/composables/lifecycle/tryOnMounted';

/**
 * Which window dimensions to track.
 *
 * - `'inner'` — `window.innerWidth/innerHeight` (or `documentElement.clientWidth/clientHeight`
 *   when `includeScrollbar` is `false`). The viewport size.
 * - `'outer'` — `window.outerWidth/outerHeight`. The whole browser window, including chrome.
 * - `'visual'` — `window.visualViewport` size, accounting for pinch-zoom scale. Useful on
 *   mobile where the visual viewport differs from the layout viewport.
 */
export type WindowSizeType = 'inner' | 'outer' | 'visual';

export interface UseWindowSizeOptions extends ConfigurableWindow {
  /**
   * The initial width, used before the window is available (e.g. during SSR).
   *
   * @default Number.POSITIVE_INFINITY
   */
  initialWidth?: number;

  /**
   * The initial height, used before the window is available (e.g. during SSR).
   *
   * @default Number.POSITIVE_INFINITY
   */
  initialHeight?: number;

  /**
   * Listen to orientation changes via a `(orientation: portrait)` media query.
   *
   * @default true
   */
  listenOrientation?: boolean;

  /**
   * Use `window.innerWidth/innerHeight` (includes scrollbar) instead of
   * `documentElement.clientWidth/clientHeight`. Only affects the `'inner'` type.
   *
   * @default true
   */
  includeScrollbar?: boolean;

  /**
   * Which window dimensions to track.
   *
   * @default 'inner'
   */
  type?: WindowSizeType;
}

export interface UseWindowSizeReturn {
  width: ShallowRef<number>;
  height: ShallowRef<number>;
}

/**
 * @name useWindowSize
 * @category Browser
 * @description Reactive window size. Tracks the inner viewport, the outer window, or the
 * visual viewport (pinch-zoom aware), and reacts to resize and orientation changes.
 *
 * @param {UseWindowSizeOptions} [options={}] Options
 * @returns {UseWindowSizeReturn} Reactive `width` and `height`
 *
 * @example
 * const { width, height } = useWindowSize();
 *
 * @example
 * // Track the pinch-zoom aware visual viewport on mobile
 * const { width, height } = useWindowSize({ type: 'visual' });
 *
 * @since 0.0.15
 */
export function useWindowSize(options: UseWindowSizeOptions = {}): UseWindowSizeReturn {
  const {
    window = defaultWindow,
    initialWidth = Number.POSITIVE_INFINITY,
    initialHeight = Number.POSITIVE_INFINITY,
    listenOrientation = true,
    includeScrollbar = true,
    type = 'inner',
  } = options;

  const width = shallowRef(initialWidth);
  const height = shallowRef(initialHeight);

  const update = (): void => {
    if (!window)
      return;

    if (type === 'outer') {
      width.value = window.outerWidth;
      height.value = window.outerHeight;
    }
    else if (type === 'visual' && window.visualViewport) {
      const { width: visualWidth, height: visualHeight, scale } = window.visualViewport;
      width.value = Math.round(visualWidth * scale);
      height.value = Math.round(visualHeight * scale);
    }
    else if (includeScrollbar) {
      width.value = window.innerWidth;
      height.value = window.innerHeight;
    }
    else {
      width.value = window.document.documentElement.clientWidth;
      height.value = window.document.documentElement.clientHeight;
    }
  };

  update();
  tryOnMounted(update);

  const listenerOptions = { passive: true } as const;

  useEventListener('resize', update, listenerOptions);

  // Reactive getter target: auto-binds when `visualViewport` becomes available and
  // is a no-op otherwise (SSR / unsupported), without recreating listeners.
  if (type === 'visual')
    useEventListener(() => window?.visualViewport, 'resize', update, listenerOptions);

  if (listenOrientation) {
    const orientation = useMediaQuery('(orientation: portrait)', { window });
    watch(orientation, update);
  }

  return { width, height };
}
