import { computed, reactive, shallowRef, toValue } from 'vue';
import type { MaybeRefOrGetter, Reactive, ShallowRef, WritableComputedRef } from 'vue';
import { noop } from '@robonen/stdlib';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { useEventListener } from '@/composables/browser/useEventListener';
import { useDebounceFn } from '@/composables/reactivity/useDebounceFn';
import { useThrottleFn } from '@/composables/reactivity/useThrottleFn';
import { tryOnMounted } from '@/composables/lifecycle/tryOnMounted';

/**
 * `scrollTop`/`scrollLeft` are sub-pixel (fractional) numbers, while
 * `scrollHeight`/`scrollWidth` and `clientHeight`/`clientWidth` are rounded
 * integers. We therefore allow a 1px tolerance when deciding whether an edge
 * has been reached.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollHeight#determine_if_an_element_has_been_totally_scrolled
 */
const ARRIVED_STATE_THRESHOLD_PIXELS = 1;

export interface UseWindowScrollOffset {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
}

export interface UseWindowScrollEdgeState {
  left: boolean;
  right: boolean;
  top: boolean;
  bottom: boolean;
}

export interface UseWindowScrollOptions extends ConfigurableWindow {
  /**
   * Throttle time (ms) for the scroll handler. Disabled by default.
   *
   * @default 0
   */
  throttle?: number;

  /**
   * Delay (ms) after the last scroll event before `isScrolling` flips back to
   * `false`. When `throttle` is set the effective idle window becomes
   * `throttle + idle`.
   *
   * @default 200
   */
  idle?: number;

  /**
   * Offset the `arrivedState` edges by a number of pixels, e.g. to treat the
   * page as "arrived at bottom" slightly before the true bottom.
   */
  offset?: UseWindowScrollOffset;

  /**
   * Invoked on every (throttled) scroll event.
   */
  onScroll?: (event: Event) => void;

  /**
   * Invoked once scrolling stops (after the idle window elapses).
   */
  onStop?: (event: Event) => void;

  /**
   * Listener options for the scroll event.
   *
   * @default { capture: false, passive: true }
   */
  eventListenerOptions?: boolean | AddEventListenerOptions;

  /**
   * Scroll behavior applied when writing to `x`/`y`. `'auto'` jumps instantly,
   * `'smooth'` animates. Accepts a ref or getter for reactivity.
   *
   * @default 'auto'
   */
  behavior?: MaybeRefOrGetter<ScrollBehavior>;
}

export interface UseWindowScrollReturn {
  /**
   * Reactive horizontal scroll position. Writing to it scrolls the window.
   */
  x: WritableComputedRef<number>;

  /**
   * Reactive vertical scroll position. Writing to it scrolls the window.
   */
  y: WritableComputedRef<number>;

  /**
   * Whether the window is currently being scrolled.
   */
  isScrolling: ShallowRef<boolean>;

  /**
   * Whether each edge of the document has been reached.
   */
  arrivedState: Reactive<UseWindowScrollEdgeState>;

  /**
   * The direction(s) the window is currently scrolling towards.
   */
  directions: Reactive<UseWindowScrollEdgeState>;

  /**
   * Force a re-measurement of `arrivedState`/`directions`.
   */
  measure: () => void;
}

/**
 * @name useWindowScroll
 * @category Elements
 * @description Reactive window scroll position with arrived/direction tracking. Writing to `x`/`y` scrolls the window.
 *
 * @param {UseWindowScrollOptions} [options={}] Options
 * @returns {UseWindowScrollReturn} Reactive `x`, `y`, `isScrolling`, `arrivedState`, `directions` and a `measure()` helper
 *
 * @example
 * const { x, y, isScrolling, arrivedState, directions } = useWindowScroll();
 *
 * @since 0.0.15
 */
export function useWindowScroll(options: UseWindowScrollOptions = {}): UseWindowScrollReturn {
  const {
    window = defaultWindow,
    throttle = 0,
    idle = 200,
    onStop = noop,
    onScroll = noop,
    offset = {},
    eventListenerOptions = { capture: false, passive: true },
    behavior = 'auto',
  } = options;

  const internalX = shallowRef(0);
  const internalY = shallowRef(0);

  // We use computed getters/setters so that writing `x`/`y` triggers a real
  // `scrollTo()` while the internal refs are updated from the scroll event
  // without re-triggering a scroll.
  const x = computed<number>({
    get: () => internalX.value,
    set: value => scrollTo(value, undefined),
  });

  const y = computed<number>({
    get: () => internalY.value,
    set: value => scrollTo(undefined, value),
  });

  function scrollTo(_x: number | undefined, _y: number | undefined): void {
    if (!window)
      return;

    window.scrollTo({
      left: _x ?? internalX.value,
      top: _y ?? internalY.value,
      behavior: toValue(behavior),
    });

    if (_x !== null && _x !== undefined)
      internalX.value = _x;
    if (_y !== null && _y !== undefined)
      internalY.value = _y;
  }

  const isScrolling = shallowRef(false);

  const arrivedState = reactive<UseWindowScrollEdgeState>({
    left: true,
    right: false,
    top: true,
    bottom: false,
  });

  const directions = reactive<UseWindowScrollEdgeState>({
    left: false,
    right: false,
    top: false,
    bottom: false,
  });

  function setArrivedState(): void {
    if (!window)
      return;

    const el = window.document.documentElement;
    const { direction } = window.getComputedStyle(el);
    const directionMultiplier = direction === 'rtl' ? -1 : 1;

    const scrollLeft = window.scrollX;
    directions.left = scrollLeft < internalX.value;
    directions.right = scrollLeft > internalX.value;

    arrivedState.left = Math.abs(scrollLeft * directionMultiplier) <= (offset.left ?? 0);
    arrivedState.right = Math.abs(scrollLeft * directionMultiplier)
      + el.clientWidth >= el.scrollWidth
      - (offset.right ?? 0)
      - ARRIVED_STATE_THRESHOLD_PIXELS;

    internalX.value = scrollLeft;

    const scrollTop = window.scrollY;
    directions.top = scrollTop < internalY.value;
    directions.bottom = scrollTop > internalY.value;

    arrivedState.top = Math.abs(scrollTop) <= (offset.top ?? 0);
    arrivedState.bottom = Math.abs(scrollTop)
      + el.clientHeight >= el.scrollHeight
      - (offset.bottom ?? 0)
      - ARRIVED_STATE_THRESHOLD_PIXELS;

    internalY.value = scrollTop;
  }

  function onScrollEnd(event: Event): void {
    // Dedupe in case the native `scrollend` event is supported.
    if (!isScrolling.value)
      return;

    isScrolling.value = false;
    directions.left = false;
    directions.right = false;
    directions.top = false;
    directions.bottom = false;
    onStop(event);
  }

  const onScrollEndDebounced = useDebounceFn(onScrollEnd, throttle + idle);

  function onScrollHandler(event: Event): void {
    if (!window)
      return;

    setArrivedState();

    isScrolling.value = true;
    onScrollEndDebounced(event);
    onScroll(event);
  }

  useEventListener(
    window,
    'scroll',
    throttle ? useThrottleFn(onScrollHandler, throttle, true, false) : onScrollHandler,
    eventListenerOptions,
  );

  useEventListener(
    window,
    'scrollend',
    onScrollEnd,
    eventListenerOptions,
  );

  tryOnMounted(setArrivedState);

  return {
    x,
    y,
    isScrolling,
    arrivedState,
    directions,
    measure: setArrivedState,
  };
}
