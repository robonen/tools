import { computed, shallowRef } from 'vue';
import type { ComputedRef, ShallowRef } from 'vue';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { useEventListener } from '@/composables/browser/useEventListener';
import { unrefElement } from '@/composables/component/unrefElement';
import type { MaybeComputedElementRef } from '@/composables/component/unrefElement';
import type { UseMouseSourceType } from '@/composables/browser/useMouse';

export type UseMousePressedEvent = MouseEvent | TouchEvent | DragEvent;

export interface UseMousePressedOptions extends ConfigurableWindow {
  /**
   * Listen to `touchstart`, `touchend`, and `touchcancel` events
   *
   * @default true
   */
  touch?: boolean;

  /**
   * Listen to `dragstart`, `drop`, and `dragend` events
   *
   * @default true
   */
  drag?: boolean;

  /**
   * Add event listeners with the `capture` option set to `true`
   * (see [MDN](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#capture))
   *
   * @default false
   */
  capture?: boolean;

  /**
   * Initial pressed state
   *
   * @default false
   */
  initialValue?: boolean;

  /**
   * Element target to capture the press on. Accepts an element ref, getter,
   * or component instance. Defaults to `window` when omitted.
   */
  target?: MaybeComputedElementRef;

  /**
   * Callback invoked when a press starts
   */
  onPressed?: (event: UseMousePressedEvent) => void;

  /**
   * Callback invoked when a press is released
   */
  onReleased?: (event: UseMousePressedEvent) => void;
}

export interface UseMousePressedReturn {
  pressed: ShallowRef<boolean>;
  sourceType: ShallowRef<UseMouseSourceType>;
}

/**
 * @name useMousePressed
 * @category Browser
 * @description Reactive mouse/touch/drag pressed state on a target, with the
 * input source type and optional press/release callbacks.
 *
 * @param {UseMousePressedOptions} [options={}] Options
 * @returns {UseMousePressedReturn} Reactive `pressed` and `sourceType`
 *
 * @example
 * const { pressed, sourceType } = useMousePressed();
 *
 * @example
 * // Track presses only on a specific element, ignore touch
 * const { pressed } = useMousePressed({ target: el, touch: false });
 *
 * @since 0.0.15
 */
export function useMousePressed(options: UseMousePressedOptions = {}): UseMousePressedReturn {
  const {
    touch = true,
    drag = true,
    capture = false,
    initialValue = false,
    window = defaultWindow,
  } = options;

  const pressed = shallowRef(initialValue);
  const sourceType = shallowRef<UseMouseSourceType>(null);

  if (!window)
    return { pressed, sourceType };

  const onPressed = (srcType: UseMouseSourceType) => (event: UseMousePressedEvent): void => {
    pressed.value = true;
    sourceType.value = srcType;
    options.onPressed?.(event);
  };

  const onReleased = (event: UseMousePressedEvent): void => {
    pressed.value = false;
    sourceType.value = null;
    options.onReleased?.(event);
  };

  const target: ComputedRef<EventTarget> = computed(() => unrefElement(options.target) ?? window);

  const listenerOptions = { passive: true, capture };

  useEventListener(target, 'mousedown', onPressed('mouse') as (e: Event) => void, listenerOptions);
  useEventListener(window, 'mouseleave', onReleased as (e: Event) => void, listenerOptions);
  useEventListener(window, 'mouseup', onReleased as (e: Event) => void, listenerOptions);

  if (drag) {
    useEventListener(target, 'dragstart', onPressed('mouse') as (e: Event) => void, listenerOptions);
    useEventListener(window, 'drop', onReleased as (e: Event) => void, listenerOptions);
    useEventListener(window, 'dragend', onReleased as (e: Event) => void, listenerOptions);
  }

  if (touch) {
    useEventListener(target, 'touchstart', onPressed('touch') as (e: Event) => void, listenerOptions);
    useEventListener(window, 'touchend', onReleased as (e: Event) => void, listenerOptions);
    useEventListener(window, 'touchcancel', onReleased as (e: Event) => void, listenerOptions);
  }

  return { pressed, sourceType };
}
