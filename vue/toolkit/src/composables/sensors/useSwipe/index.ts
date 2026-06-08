import { computed, reactive, shallowReadonly, shallowRef } from 'vue';
import type { ComputedRef, DeepReadonly, ShallowRef } from 'vue';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { useEventListener } from '@/composables/browser/useEventListener';
import { unrefElement } from '@/composables/component/unrefElement';
import type { MaybeComputedElementRef } from '@/composables/component/unrefElement';

export type UseSwipeDirection = 'up' | 'down' | 'left' | 'right' | 'none';

export interface UseSwipePosition {
  x: number;
  y: number;
}

export interface UseSwipeOptions extends ConfigurableWindow {
  /**
   * Register events as passive.
   *
   * When `false`, the move handler can call `preventDefault()` to block
   * scrolling while swiping horizontally.
   *
   * @default true
   */
  passive?: boolean;

  /**
   * Minimum distance in pixels travelled before a swipe is registered.
   *
   * @default 50
   */
  threshold?: number;

  /**
   * Callback fired on the initial touch, before the threshold is met.
   */
  onSwipeStart?: (event: TouchEvent) => void;

  /**
   * Callback fired on every move once the swipe is active.
   */
  onSwipe?: (event: TouchEvent) => void;

  /**
   * Callback fired when the touch ends, with the resolved direction.
   */
  onSwipeEnd?: (event: TouchEvent, direction: UseSwipeDirection) => void;
}

export interface UseSwipeReturn {
  /**
   * Whether a swipe is currently in progress (threshold exceeded).
   */
  isSwiping: ShallowRef<boolean>;

  /**
   * The resolved swipe direction.
   */
  direction: ComputedRef<UseSwipeDirection>;

  /**
   * Coordinates of the initial touch.
   */
  coordsStart: DeepReadonly<UseSwipePosition>;

  /**
   * Coordinates of the latest touch position.
   */
  coordsEnd: DeepReadonly<UseSwipePosition>;

  /**
   * Signed horizontal distance travelled (`coordsEnd.x - coordsStart.x`).
   */
  lengthX: ComputedRef<number>;

  /**
   * Signed vertical distance travelled (`coordsEnd.y - coordsStart.y`).
   */
  lengthY: ComputedRef<number>;

  /**
   * Tear down all listeners.
   */
  stop: () => void;
}

/**
 * @name useSwipe
 * @category Sensors
 * @description Detect swipe gestures via touch events on a target element.
 * Tracks start/end coordinates, the active state and the resolved direction.
 *
 * @param {MaybeComputedElementRef} target - Element ref, getter, or instance to listen on
 * @param {UseSwipeOptions} [options={}] - Threshold, lifecycle callbacks and passive flag
 * @returns {UseSwipeReturn} Reactive swipe state and a `stop` teardown function
 *
 * @example
 * const el = useTemplateRef<HTMLElement>('el');
 * const { isSwiping, direction, lengthX, lengthY } = useSwipe(el, {
 *   onSwipeEnd(e, dir) { console.log(dir); },
 * });
 *
 * @since 0.0.15
 */
export function useSwipe(
  target: MaybeComputedElementRef,
  options: UseSwipeOptions = {},
): UseSwipeReturn {
  const {
    passive = true,
    threshold = 50,
    onSwipe,
    onSwipeEnd,
    onSwipeStart,
    window = defaultWindow,
  } = options;

  const coordsStart = reactive<UseSwipePosition>({ x: 0, y: 0 });
  const coordsEnd = reactive<UseSwipePosition>({ x: 0, y: 0 });

  // diffX/diffY follow the start-minus-end convention used for direction math.
  const diffX = computed(() => coordsStart.x - coordsEnd.x);
  const diffY = computed(() => coordsStart.y - coordsEnd.y);

  // Public lengths report the signed travel from start to end.
  const lengthX = computed(() => coordsEnd.x - coordsStart.x);
  const lengthY = computed(() => coordsEnd.y - coordsStart.y);

  const { max, abs } = Math;
  const isThresholdExceeded = computed(() => max(abs(diffX.value), abs(diffY.value)) >= threshold);

  const isSwiping = shallowRef(false);

  const direction = computed<UseSwipeDirection>(() => {
    if (!isThresholdExceeded.value)
      return 'none';

    if (abs(diffX.value) > abs(diffY.value))
      return diffX.value > 0 ? 'left' : 'right';

    return diffY.value > 0 ? 'up' : 'down';
  });

  // capture: !passive lets the move handler call preventDefault when blocking
  // native scrolling during a horizontal swipe.
  const listenerOptions = { passive, capture: !passive };

  const updateCoordsStart = (x: number, y: number): void => {
    coordsStart.x = x;
    coordsStart.y = y;
  };

  const updateCoordsEnd = (x: number, y: number): void => {
    coordsEnd.x = x;
    coordsEnd.y = y;
  };

  const getTouchEventCoords = (event: TouchEvent): [number, number] => [
    event.touches[0]!.clientX,
    event.touches[0]!.clientY,
  ];

  const onTouchStart = (event: TouchEvent): void => {
    if (event.touches.length !== 1)
      return;

    const [x, y] = getTouchEventCoords(event);
    updateCoordsStart(x, y);
    updateCoordsEnd(x, y);
    onSwipeStart?.(event);
  };

  const onTouchMove = (event: TouchEvent): void => {
    if (event.touches.length !== 1)
      return;

    const [x, y] = getTouchEventCoords(event);
    updateCoordsEnd(x, y);

    if (!listenerOptions.passive && abs(diffX.value) > abs(diffY.value))
      event.preventDefault();

    if (!isSwiping.value && isThresholdExceeded.value)
      isSwiping.value = true;

    if (isSwiping.value)
      onSwipe?.(event);
  };

  const onTouchEnd = (event: TouchEvent): void => {
    if (isSwiping.value)
      onSwipeEnd?.(event, direction.value);

    isSwiping.value = false;
  };

  // Resolve the listen target lazily so listeners re-bind when the underlying
  // element changes (template refs resolve after mount).
  const listenTarget = (): EventTarget | null | undefined =>
    unrefElement(target) as EventTarget | null | undefined;

  const stops = window
    ? [
        useEventListener(listenTarget, 'touchstart', onTouchStart as (e: Event) => void, listenerOptions),
        useEventListener(listenTarget, 'touchmove', onTouchMove as (e: Event) => void, listenerOptions),
        useEventListener(listenTarget, ['touchend', 'touchcancel'], onTouchEnd as (e: Event) => void, listenerOptions),
      ]
    : [];

  const stop = (): void => stops.forEach(s => s());

  return {
    isSwiping,
    direction: shallowReadonly(direction) as ComputedRef<UseSwipeDirection>,
    coordsStart: shallowReadonly(coordsStart),
    coordsEnd: shallowReadonly(coordsEnd),
    lengthX,
    lengthY,
    stop,
  };
}
