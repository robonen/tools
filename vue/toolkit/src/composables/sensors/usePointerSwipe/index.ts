import { computed, reactive, shallowReadonly, shallowRef } from 'vue';
import type { ComputedRef, DeepReadonly, ShallowRef } from 'vue';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { useEventListener } from '@/composables/browser/useEventListener';
import { tryOnMounted } from '@/composables/lifecycle/tryOnMounted';
import { unrefElement } from '@/composables/component/unrefElement';
import type { MaybeComputedElementRef } from '@/composables/component/unrefElement';
import type { UsePointerType } from '@/composables/sensors/usePointer';

export type UsePointerSwipeDirection = 'up' | 'down' | 'left' | 'right' | 'none';

export interface UsePointerSwipePosition {
  x: number;
  y: number;
}

export interface UsePointerSwipeOptions extends ConfigurableWindow {
  /**
   * Minimum distance in pixels travelled before a swipe is registered.
   *
   * @default 50
   */
  threshold?: number;

  /**
   * Pointer types that should be listened to.
   *
   * When omitted, any primary-button press (or a released pointer) is accepted.
   *
   * @default undefined
   */
  pointerTypes?: UsePointerType[];

  /**
   * Disable text selection while swiping (sets `user-select: none` on the target).
   *
   * @default false
   */
  disableTextSelect?: boolean;

  /**
   * Callback fired on the initial pointer down, before the threshold is met.
   */
  onSwipeStart?: (event: PointerEvent) => void;

  /**
   * Callback fired on every pointer move once the swipe is active.
   */
  onSwipe?: (event: PointerEvent) => void;

  /**
   * Callback fired when the pointer is released, with the resolved direction.
   */
  onSwipeEnd?: (event: PointerEvent, direction: UsePointerSwipeDirection) => void;
}

export interface UsePointerSwipeReturn {
  /**
   * Whether a swipe is currently in progress (threshold exceeded).
   */
  isSwiping: Readonly<ShallowRef<boolean>>;

  /**
   * The resolved swipe direction.
   */
  direction: ComputedRef<UsePointerSwipeDirection>;

  /**
   * Coordinates where the pointer went down.
   */
  posStart: DeepReadonly<UsePointerSwipePosition>;

  /**
   * Coordinates of the latest pointer position.
   */
  posEnd: DeepReadonly<UsePointerSwipePosition>;

  /**
   * Signed horizontal distance travelled (`posStart.x - posEnd.x`).
   */
  distanceX: ComputedRef<number>;

  /**
   * Signed vertical distance travelled (`posStart.y - posEnd.y`).
   */
  distanceY: ComputedRef<number>;

  /**
   * Tear down all listeners.
   */
  stop: () => void;
}

/**
 * @name usePointerSwipe
 * @category Sensors
 * @description Detect swipe gestures via PointerEvents on a target element.
 * Works for mouse, touch and pen with a single unified event model, tracking
 * start/end coordinates, the active state and the resolved direction.
 *
 * @param {MaybeComputedElementRef} target - Element ref, getter, or instance to listen on
 * @param {UsePointerSwipeOptions} [options={}] - Threshold, pointer types and lifecycle callbacks
 * @returns {UsePointerSwipeReturn} Reactive swipe state and a `stop` teardown function
 *
 * @example
 * const el = useTemplateRef<HTMLElement>('el');
 * const { isSwiping, direction, distanceX, distanceY } = usePointerSwipe(el, {
 *   threshold: 30,
 *   onSwipeEnd(e, dir) { console.log(dir); },
 * });
 *
 * @since 0.0.15
 */
export function usePointerSwipe(
  target: MaybeComputedElementRef,
  options: UsePointerSwipeOptions = {},
): UsePointerSwipeReturn {
  const {
    threshold = 50,
    pointerTypes,
    disableTextSelect = false,
    onSwipe,
    onSwipeEnd,
    onSwipeStart,
    window = defaultWindow,
  } = options;

  const posStart = reactive<UsePointerSwipePosition>({ x: 0, y: 0 });
  const posEnd = reactive<UsePointerSwipePosition>({ x: 0, y: 0 });

  // distanceX/distanceY follow the start-minus-end convention used for direction math.
  const distanceX = computed(() => posStart.x - posEnd.x);
  const distanceY = computed(() => posStart.y - posEnd.y);

  const { max, abs } = Math;
  const isThresholdExceeded = computed(() => max(abs(distanceX.value), abs(distanceY.value)) >= threshold);

  const isSwiping = shallowRef(false);
  const isPointerDown = shallowRef(false);

  const direction = computed<UsePointerSwipeDirection>(() => {
    if (!isThresholdExceeded.value)
      return 'none';

    if (abs(distanceX.value) > abs(distanceY.value))
      return distanceX.value > 0 ? 'left' : 'right';

    return distanceY.value > 0 ? 'up' : 'down';
  });

  const updatePosStart = (x: number, y: number): void => {
    posStart.x = x;
    posStart.y = y;
  };

  const updatePosEnd = (x: number, y: number): void => {
    posEnd.x = x;
    posEnd.y = y;
  };

  const eventIsAllowed = (event: PointerEvent): boolean => {
    if (pointerTypes)
      return pointerTypes.includes(event.pointerType as UsePointerType);

    // No explicit filter: accept a primary-button press or a released pointer.
    return event.buttons === 0 || event.buttons === 1;
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (!eventIsAllowed(event))
      return;

    isPointerDown.value = true;
    // Retarget future pointer events to the element until pointerup/cancel.
    (event.target as Element | null)?.setPointerCapture?.(event.pointerId);

    const { clientX: x, clientY: y } = event;
    updatePosStart(x, y);
    updatePosEnd(x, y);
    onSwipeStart?.(event);
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (!isPointerDown.value || !eventIsAllowed(event))
      return;

    updatePosEnd(event.clientX, event.clientY);

    if (!isSwiping.value && isThresholdExceeded.value)
      isSwiping.value = true;

    if (isSwiping.value)
      onSwipe?.(event);
  };

  const onPointerEnd = (event: PointerEvent): void => {
    if (!eventIsAllowed(event))
      return;

    if (isSwiping.value)
      onSwipeEnd?.(event, direction.value);

    isPointerDown.value = false;
    isSwiping.value = false;
  };

  // Resolve the listen target lazily so listeners re-bind when the underlying
  // element changes (template refs resolve after mount).
  const listenTarget = (): EventTarget | null | undefined =>
    unrefElement(target) as EventTarget | null | undefined;

  const listenerOptions = { passive: true };

  const stops = window
    ? [
        useEventListener(listenTarget, 'pointerdown', onPointerDown as (e: Event) => void, listenerOptions),
        useEventListener(listenTarget, 'pointermove', onPointerMove as (e: Event) => void, listenerOptions),
        useEventListener(listenTarget, ['pointerup', 'pointercancel'], onPointerEnd as (e: Event) => void, listenerOptions),
      ]
    : [];

  tryOnMounted(() => {
    const el = unrefElement(target) as HTMLElement | null | undefined;
    // Allow vertical scrolling, disable horizontal scrolling by touch.
    el?.style?.setProperty('touch-action', 'pan-y');

    if (disableTextSelect) {
      el?.style?.setProperty('-webkit-user-select', 'none');
      el?.style?.setProperty('-ms-user-select', 'none');
      el?.style?.setProperty('user-select', 'none');
    }
  });

  const stop = (): void => stops.forEach(s => s());

  return {
    isSwiping: shallowReadonly(isSwiping),
    direction: shallowReadonly(direction) as ComputedRef<UsePointerSwipeDirection>,
    posStart: shallowReadonly(posStart),
    posEnd: shallowReadonly(posEnd),
    distanceX,
    distanceY,
    stop,
  };
}
