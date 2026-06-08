import type { VoidFunction } from '@robonen/stdlib';
import { isFunction } from '@robonen/stdlib';
import { computed } from 'vue';
import type { MaybeComputedElementRef } from '@/composables/component/unrefElement';
import { unrefElement } from '@/composables/component/unrefElement';
import { useEventListener } from '@/composables/browser/useEventListener';

const DEFAULT_DELAY = 500;
const DEFAULT_THRESHOLD = 10;

export interface OnLongPressPosition {
  x: number;
  y: number;
}

export interface OnLongPressModifiers {
  /**
   * Call `stopPropagation` on the pointer events.
   *
   * @default false
   */
  stop?: boolean;

  /**
   * Register the underlying listeners with `{ once: true }`.
   *
   * @default false
   */
  once?: boolean;

  /**
   * Call `preventDefault` on the pointer events. Forces non-passive listeners.
   *
   * @default false
   */
  prevent?: boolean;

  /**
   * Register the underlying listeners in the capture phase.
   *
   * @default false
   */
  capture?: boolean;

  /**
   * Only react when the event originates from the target element itself
   * (i.e. ignore events that bubbled up from descendants).
   *
   * @default false
   */
  self?: boolean;
}

export interface OnLongPressOptions {
  /**
   * Time in milliseconds the pointer must be held before the handler fires.
   * A function receives the originating `pointerdown` event and returns the delay.
   *
   * @default 500
   */
  delay?: number | ((event: PointerEvent) => number);

  /**
   * Pointer-event behaviour flags.
   */
  modifiers?: OnLongPressModifiers;

  /**
   * Maximum pointer travel (in pixels) tolerated before the press is cancelled.
   * Pass `false` to disable movement cancellation entirely.
   *
   * @default 10
   */
  distanceThreshold?: number | false;

  /**
   * Invoked on pointer release. Receives the press duration (ms), the distance
   * travelled (px), whether the press qualified as a long press, and the event.
   */
  onMouseUp?: (duration: number, distance: number, isLongPress: boolean, event: PointerEvent) => void;
}

export type OnLongPressReturn = VoidFunction;

/**
 * @name onLongPress
 * @category Sensors
 * @description Directive-like helper that invokes a handler after a sustained long press
 * on a target element. Movement beyond `distanceThreshold` cancels the press, and an
 * optional `onMouseUp` callback reports the press duration, distance, and long-press status.
 * Listeners are passive by default and registered via `useEventListener` for automatic cleanup.
 *
 * @param {MaybeComputedElementRef} target Element to watch for long presses
 * @param {(event: PointerEvent) => void} handler Callback fired once the press passes `delay`
 * @param {OnLongPressOptions} [options={}] Long-press configuration
 * @returns {OnLongPressReturn} Stop handle that removes all listeners
 *
 * @example
 * onLongPress(el, () => console.log('held!'));
 *
 * @example
 * // Custom delay, cancel-on-move disabled, release reporting
 * const stop = onLongPress(el, onHeld, {
 *   delay: 800,
 *   distanceThreshold: false,
 *   modifiers: { prevent: true },
 *   onMouseUp: (duration, distance, isLongPress) => {
 *     if (!isLongPress) onTap();
 *   },
 * });
 *
 * @since 0.0.15
 */
export function onLongPress(
  target: MaybeComputedElementRef,
  handler: (event: PointerEvent) => void,
  options: OnLongPressOptions = {},
): OnLongPressReturn {
  const { delay = DEFAULT_DELAY, modifiers = {}, distanceThreshold = DEFAULT_THRESHOLD, onMouseUp } = options;
  const { self: selfOnly = false, prevent = false, stop: stopProp = false, capture = false, once = false } = modifiers;

  // Resolve the element once and cache it; reactive targets re-trigger this getter
  // and the underlying useEventListener watch re-binds automatically.
  const elementRef = computed(() => unrefElement(target));

  // Hoisted as a function-valued delay only when the caller supplies one,
  // so the common numeric path skips the per-press branch entirely.
  const getDelay = isFunction(delay)
    ? delay
    : (): number => delay;

  let timeout: ReturnType<typeof setTimeout> | undefined;
  let posStart: OnLongPressPosition | undefined;
  let startTimestamp: number | undefined;
  let hasLongPressed = false;

  function clear(): void {
    if (timeout !== undefined) {
      clearTimeout(timeout);
      timeout = undefined;
    }
    posStart = undefined;
    startTimestamp = undefined;
    hasLongPressed = false;
  }

  function isForeignTarget(event: PointerEvent): boolean {
    return selfOnly && event.target !== elementRef.value;
  }

  function applyModifiers(event: PointerEvent): void {
    if (prevent)
      event.preventDefault();
    if (stopProp)
      event.stopPropagation();
  }

  function onDown(event: PointerEvent): void {
    if (isForeignTarget(event))
      return;

    clear();
    applyModifiers(event);

    posStart = { x: event.x, y: event.y };
    startTimestamp = event.timeStamp;

    timeout = setTimeout(() => {
      hasLongPressed = true;
      handler(event);
    }, getDelay(event));
  }

  function onMove(event: PointerEvent): void {
    if (isForeignTarget(event) || !posStart || distanceThreshold === false)
      return;

    applyModifiers(event);

    const dx = event.x - posStart.x;
    const dy = event.y - posStart.y;
    const distance = Math.hypot(dx, dy);

    if (distance >= distanceThreshold)
      clear();
  }

  function onRelease(event: PointerEvent): void {
    const _posStart = posStart;
    const _startTimestamp = startTimestamp;
    const _hasLongPressed = hasLongPressed;
    clear();

    if (!onMouseUp || !_posStart || _startTimestamp === undefined)
      return;

    if (isForeignTarget(event))
      return;

    applyModifiers(event);

    const dx = event.x - _posStart.x;
    const dy = event.y - _posStart.y;
    const distance = Math.hypot(dx, dy);

    onMouseUp(event.timeStamp - _startTimestamp, distance, _hasLongPressed, event);
  }

  // Passive unless the caller intends to preventDefault, in which case the
  // listener must be active for the browser to honour it.
  const listenerOptions: AddEventListenerOptions = {
    capture,
    once,
    passive: !prevent,
  };

  const cleanups = [
    useEventListener(elementRef, 'pointerdown', onDown, listenerOptions),
    useEventListener(elementRef, 'pointermove', onMove, listenerOptions),
    useEventListener(elementRef, ['pointerup', 'pointerleave'], onRelease, listenerOptions),
  ];

  return (): void => {
    clear();
    cleanups.forEach(stop => stop());
  };
}
