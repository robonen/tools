import { shallowRef } from 'vue';
import type { Ref } from 'vue';
import { isFunction } from '@robonen/stdlib';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { useEventListener } from '@/composables/browser/useEventListener';
import { unrefElement } from '@/composables/component/unrefElement';
import type { MaybeComputedElementRef } from '@/composables/component/unrefElement';
import { bypassFilter, createFilterWrapper } from '@/utils/filters';
import type { ConfigurableEventFilter } from '@/utils/filters';

export type UseMouseCoordType = 'page' | 'client' | 'screen' | 'movement';
export type UseMouseSourceType = 'mouse' | 'touch' | null;

/**
 * Extracts an `[x, y]` pair from a mouse or touch point, or `null` to skip.
 */
export type UseMouseEventExtractor = (event: MouseEvent | Touch) => [x: number, y: number] | null | undefined;

export interface UseMouseOptions extends ConfigurableWindow, ConfigurableEventFilter {
  /**
   * Which coordinate pair to read from the event, or a custom extractor function
   *
   * @default 'page'
   */
  type?: UseMouseCoordType | UseMouseEventExtractor;

  /**
   * Target to attach the listeners to. Accepts a window, document, element ref,
   * getter, or component instance.
   *
   * @default window
   */
  target?: MaybeComputedElementRef | Window | Document;

  /**
   * Listen to touch events
   *
   * @default true
   */
  touch?: boolean;

  /**
   * Track window scroll so that `page` coordinates stay accurate while the page
   * scrolls without the pointer moving. Only applies when `type === 'page'`.
   *
   * @default true
   */
  scroll?: boolean;

  /**
   * Reset coordinates to `initialValue` on `touchend`
   *
   * @default false
   */
  resetOnTouchEnds?: boolean;

  /**
   * Initial coordinates
   *
   * @default { x: 0, y: 0 }
   */
  initialValue?: { x: number; y: number };
}

export interface UseMouseReturn {
  x: Ref<number>;
  y: Ref<number>;
  sourceType: Ref<UseMouseSourceType>;
}

const builtinExtractors: Record<UseMouseCoordType, UseMouseEventExtractor> = {
  page: e => [(e as MouseEvent).pageX, (e as MouseEvent).pageY],
  client: e => [e.clientX, e.clientY],
  screen: e => [e.screenX, e.screenY],
  movement: e => ('movementX' in e ? [e.movementX, e.movementY] : null),
};

/**
 * @name useMouse
 * @category Sensors
 * @description Reactive mouse (and optionally touch) position with optional
 * custom target, scroll tracking, custom extractors, and event filtering.
 *
 * @param {UseMouseOptions} [options={}] Options
 * @returns {UseMouseReturn} Reactive `x`, `y`, and `sourceType`
 *
 * @example
 * const { x, y, sourceType } = useMouse();
 *
 * @example
 * // Track relative to an element, throttled
 * const { x, y } = useMouse({ target: el, eventFilter: throttleFilter(50) });
 *
 * @since 0.0.15
 */
export function useMouse(options: UseMouseOptions = {}): UseMouseReturn {
  const {
    type = 'page',
    touch = true,
    scroll = true,
    resetOnTouchEnds = false,
    initialValue = { x: 0, y: 0 },
    window = defaultWindow,
    target = window,
    eventFilter,
  } = options;

  let prevMouseEvent: MouseEvent | null = null;
  let prevScrollX = 0;
  let prevScrollY = 0;

  const x = shallowRef(initialValue.x);
  const y = shallowRef(initialValue.y);
  const sourceType = shallowRef<UseMouseSourceType>(null);

  const isExtractorFn = isFunction(type);
  const extractor: UseMouseEventExtractor = isExtractorFn ? type : builtinExtractors[type];

  const mouseHandler = (event: MouseEvent) => {
    const result = extractor(event);
    prevMouseEvent = event;

    if (result) {
      [x.value, y.value] = result;
      sourceType.value = 'mouse';
    }

    if (window) {
      prevScrollX = window.scrollX;
      prevScrollY = window.scrollY;
    }
  };

  const touchHandler = (event: TouchEvent) => {
    if (event.touches.length) {
      const result = extractor(event.touches[0]!);

      if (result) {
        [x.value, y.value] = result;
        sourceType.value = 'touch';
      }
    }
  };

  // Keep page coordinates correct when scrolling without moving the pointer.
  const scrollHandler = () => {
    if (!prevMouseEvent || !window)
      return;

    const result = extractor(prevMouseEvent);

    if (result) {
      x.value = result[0] + window.scrollX - prevScrollX;
      y.value = result[1] + window.scrollY - prevScrollY;
    }
  };

  const reset = () => {
    x.value = initialValue.x;
    y.value = initialValue.y;
  };

  const filter = eventFilter ?? bypassFilter;
  const mouseHandlerWrapper = createFilterWrapper(filter, mouseHandler);
  const touchHandlerWrapper = createFilterWrapper(filter, touchHandler);
  const scrollHandlerWrapper = createFilterWrapper(filter, scrollHandler);

  const trackTouch = touch && !(isExtractorFn ? false : type === 'movement');
  const trackScroll = scroll && !!window && (isExtractorFn ? true : type === 'page');

  // A raw window/document/EventTarget is used directly (fast, non-reactive path
  // in useEventListener). Refs/getters/element instances are resolved lazily via
  // a getter so the listeners re-bind when the underlying element changes.
  const listenTarget = isTarget(target)
    ? target
    : (): EventTarget | null | undefined => unrefElement(target as MaybeComputedElementRef) as EventTarget | null | undefined;

  if (target) {
    const listenerOptions = { passive: true };

    useEventListener(listenTarget, ['mousemove', 'dragover'], mouseHandlerWrapper as unknown as (e: Event) => void, listenerOptions);

    if (trackTouch) {
      useEventListener(listenTarget, ['touchstart', 'touchmove'], touchHandlerWrapper as unknown as (e: Event) => void, listenerOptions);

      if (resetOnTouchEnds)
        useEventListener(listenTarget, 'touchend', reset, listenerOptions);
    }

    if (trackScroll)
      useEventListener(window, 'scroll', scrollHandlerWrapper as (e: Event) => void, listenerOptions);
  }

  return { x, y, sourceType };
}

/**
 * `true` for an object that is itself an event target (window/document/element)
 * and should be attached to directly, rather than unwrapped from a ref/getter.
 */
function isTarget(value: unknown): value is EventTarget {
  return typeof value === 'object' && value !== null && 'addEventListener' in value;
}
