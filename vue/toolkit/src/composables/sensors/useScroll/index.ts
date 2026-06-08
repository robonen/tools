import { computed, reactive, shallowRef, toValue } from 'vue';
import type { MaybeRefOrGetter, Ref } from 'vue';
import { noop } from '@robonen/stdlib';
import type { ConfigurableWindow } from '@/types';
import { defaultWindow } from '@/types';
import { useEventListener } from '@/composables/browser/useEventListener';
import { useMutationObserver } from '@/composables/elements/useMutationObserver';
import { useThrottleFn } from '@/composables/reactivity/useThrottleFn';
import { useDebounceFn } from '@/composables/reactivity/useDebounceFn';

export interface UseScrollOffset {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
}

export interface UseScrollObserveOptions {
  /**
   * Re-measure the arrived/position state whenever the target's subtree
   * mutates (children added/removed, attributes changed). Useful when the
   * scrollable content grows or shrinks without a scroll event firing.
   *
   * @default false
   */
  mutation?: boolean;
}

export interface UseScrollOptions extends ConfigurableWindow {
  /**
   * Throttle delay (ms) for scroll position updates. `0` disables throttling.
   *
   * @default 0
   */
  throttle?: number;

  /**
   * Idle time (ms) before `isScrolling` is reset to `false`
   *
   * @default 200
   */
  idle?: number;

  /**
   * Distance (px) from each edge at which `arrivedState` flips to `true`
   *
   * @default { left: 0, right: 0, top: 0, bottom: 0 }
   */
  offset?: UseScrollOffset;

  /**
   * Called on every scroll event
   */
  onScroll?: (event: Event) => void;

  /**
   * Called when scrolling stops (after `idle`)
   */
  onStop?: (event: Event) => void;

  /**
   * Listener options for the scroll event
   *
   * @default { capture: false, passive: true }
   */
  eventListenerOptions?: boolean | AddEventListenerOptions;

  /**
   * Scroll behavior used when writing to `x`/`y`
   *
   * @default 'auto'
   */
  behavior?: ScrollBehavior;

  /**
   * Re-measure the scroll state on DOM mutations of the target.
   * Pass `true` to enable the default (`{ mutation: true }`).
   *
   * @default false
   */
  observe?: boolean | UseScrollObserveOptions;

  /**
   * Error handler invoked when reading scroll metrics or computed style throws
   * (e.g. a detached or cross-origin element).
   *
   * @default console.error
   */
  onError?: (error: unknown) => void;
}

export type UseScrollTarget = MaybeRefOrGetter<HTMLElement | SVGElement | Window | Document | null | undefined>;

export interface UseScrollEdgeState {
  left: boolean;
  right: boolean;
  top: boolean;
  bottom: boolean;
}

export interface UseScrollReturn {
  x: Ref<number>;
  y: Ref<number>;
  isScrolling: Ref<boolean>;
  arrivedState: UseScrollEdgeState;
  directions: UseScrollEdgeState;
  /**
   * Recompute `x`, `y`, `arrivedState`, and `directions` from the current DOM
   * state. Call after a programmatic layout change that did not emit a scroll
   * event.
   */
  measure: () => void;
}

const ARRIVED_STATE_THRESHOLD_PIXELS = 1;

interface ScrollMetrics {
  scrollLeft: number;
  scrollTop: number;
  scrollWidth: number;
  scrollHeight: number;
  clientWidth: number;
  clientHeight: number;
  /**
   * `-1` when the element is laid out right-to-left, `1` otherwise. Used to
   * normalise the (possibly negative) `scrollLeft` reported under RTL.
   */
  directionMultiplier: number;
}

function isWindow(value: unknown, window: Window | undefined): value is Window {
  return value === window || (typeof Window !== 'undefined' && value instanceof Window);
}

function getScrollMetrics(
  el: HTMLElement | SVGElement | Window | Document,
  window: Window,
): ScrollMetrics {
  if (isWindow(el, window)) {
    const doc = window.document.documentElement;
    return {
      scrollLeft: window.scrollX,
      scrollTop: window.scrollY,
      scrollWidth: doc.scrollWidth,
      scrollHeight: doc.scrollHeight,
      clientWidth: window.innerWidth,
      clientHeight: window.innerHeight,
      directionMultiplier: getDirectionMultiplier(doc, window),
    };
  }

  const node = (el instanceof Document ? el.documentElement : el) as HTMLElement;

  return {
    scrollLeft: node.scrollLeft,
    scrollTop: node.scrollTop,
    scrollWidth: node.scrollWidth,
    scrollHeight: node.scrollHeight,
    clientWidth: node.clientWidth,
    clientHeight: node.clientHeight,
    directionMultiplier: getDirectionMultiplier(node, window),
  };
}

function getDirectionMultiplier(node: Element, window: Window): number {
  // getComputedStyle can throw on detached nodes; callers wrap this in try/catch.
  return window.getComputedStyle(node).direction === 'rtl' ? -1 : 1;
}

/**
 * @name useScroll
 * @category Sensors
 * @description Reactive scroll position and state for an element or the window,
 * with arrived-edge detection (RTL-aware), scroll directions, an `isScrolling`
 * flag, optional throttling, and a `measure()` method for manual re-sync.
 *
 * @param {UseScrollTarget} target The scroll container (can be reactive)
 * @param {UseScrollOptions} [options={}] Options
 * @returns {UseScrollReturn} Reactive position, scroll state, arrived edges, directions, and `measure`
 *
 * @example
 * const { x, y, isScrolling, arrivedState, measure } = useScroll(el);
 *
 * @since 0.0.15
 */
export function useScroll(
  target: UseScrollTarget,
  options: UseScrollOptions = {},
): UseScrollReturn {
  const {
    throttle = 0,
    idle = 200,
    onStop = noop,
    onScroll = noop,
    offset = {},
    eventListenerOptions = { capture: false, passive: true },
    behavior = 'auto',
    window = defaultWindow,
    observe: observeOption = false,
    onError = noop,
  } = options;

  const internalX = shallowRef(0);
  const internalY = shallowRef(0);

  const isScrolling = shallowRef(false);
  const arrivedState = reactive<UseScrollEdgeState>({ left: true, right: false, top: true, bottom: false });
  const directions = reactive<UseScrollEdgeState>({ left: false, right: false, top: false, bottom: false });

  const scrollTo = (axis: 'x' | 'y', value: number): void => {
    const el = toValue(target);

    if (!el)
      return;

    (el instanceof Document ? el.documentElement : el as HTMLElement | Window).scrollTo(
      axis === 'x' ? { left: value, behavior } : { top: value, behavior },
    );
  };

  const x = computed<number>({
    get: () => internalX.value,
    set: value => scrollTo('x', value),
  });

  const y = computed<number>({
    get: () => internalY.value,
    set: value => scrollTo('y', value),
  });

  const setArrivedState = (m: ScrollMetrics): void => {
    // RTL elements report a negative scrollLeft; normalise to a magnitude so
    // edge maths is identical to the LTR case.
    const left = Math.abs(m.scrollLeft);
    const top = Math.abs(m.scrollTop);

    arrivedState.left = left <= (offset.left ?? 0);
    arrivedState.right = left + m.clientWidth >= m.scrollWidth - (offset.right ?? 0) - ARRIVED_STATE_THRESHOLD_PIXELS;
    arrivedState.top = top <= (offset.top ?? 0);
    arrivedState.bottom = top + m.clientHeight >= m.scrollHeight - (offset.bottom ?? 0) - ARRIVED_STATE_THRESHOLD_PIXELS;
  };

  // `trackDirections` only applies when driven by a real scroll event; a manual
  // measure() should not invent directions, so it is skipped there.
  const sync = (trackDirections: boolean): void => {
    const el = toValue(target);

    if (!el || !window)
      return;

    let m: ScrollMetrics;
    try {
      m = getScrollMetrics(el, window);
    }
    catch (error) {
      onError(error);
      return;
    }

    const left = m.scrollLeft;
    const top = m.scrollTop;

    if (trackDirections) {
      directions.left = left < internalX.value;
      directions.right = left > internalX.value;
      directions.top = top < internalY.value;
      directions.bottom = top > internalY.value;
    }

    setArrivedState(m);

    internalX.value = left;
    internalY.value = top;
  };

  const measure = (): void => sync(false);

  const onScrollEnd = useDebounceFn((event: Event) => {
    // Guard against the debounce trailing edge firing after we already settled.
    if (!isScrolling.value)
      return;

    isScrolling.value = false;
    directions.left = false;
    directions.right = false;
    directions.top = false;
    directions.bottom = false;
    onStop(event);
  }, throttle + idle);

  const onScrollHandler = (event: Event): void => {
    if (!toValue(target) || !window)
      return;

    sync(true);

    isScrolling.value = true;
    onScrollEnd(event);
    onScroll(event);
  };

  const handler = throttle > 0
    ? useThrottleFn(onScrollHandler, throttle, true, true)
    : onScrollHandler;

  useEventListener(
    target as MaybeRefOrGetter<EventTarget | null | undefined>,
    'scroll',
    handler as (event: Event) => void,
    eventListenerOptions,
  );

  // Initial measure once a target is resolvable so x/y/arrivedState reflect the
  // real starting position instead of the optimistic top-left defaults.
  measure();

  const observe = observeOption === true ? { mutation: true } : observeOption;

  if (observe && observe.mutation) {
    useMutationObserver(
      // Window/Document are not observable elements; only observe real elements.
      () => {
        const el = toValue(target);
        return el && !isWindow(el, window) && !(el instanceof Document) ? el : null;
      },
      () => measure(),
      { window, attributes: true, childList: true, subtree: true },
    );
  }

  return {
    x,
    y,
    isScrolling,
    arrivedState,
    directions,
    measure,
  };
}
