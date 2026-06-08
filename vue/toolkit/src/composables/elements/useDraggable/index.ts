import { computed, shallowRef, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';
import { noop } from '@robonen/stdlib';
import { defaultWindow } from '@/types';
import { useEventListener } from '@/composables/browser/useEventListener';
import { unrefElement } from '@/composables/component/unrefElement';
import type { MaybeComputedElementRef } from '@/composables/component/unrefElement';

export type UseDraggableAxis = 'x' | 'y' | 'both';
export type UseDraggablePointerType = 'mouse' | 'touch' | 'pen';

export interface Position {
  x: number;
  y: number;
}

export interface UseDraggableOptions {
  /**
   * Initial position of the draggable element.
   *
   * @default { x: 0, y: 0 }
   */
  initialValue?: MaybeRefOrGetter<Position>;

  /**
   * Axis along which dragging is allowed.
   *
   * @default 'both'
   */
  axis?: UseDraggableAxis;

  /**
   * Element that initiates the drag. Defaults to the dragged `target` itself.
   * Accepts an element ref, getter, or component instance.
   *
   * @default target
   */
  handle?: MaybeComputedElementRef;

  /**
   * Element whose bounds constrain the dragged element. When set, the position
   * is clamped so the element cannot be dragged outside of it.
   *
   * @default undefined
   */
  containerElement?: MaybeComputedElementRef;

  /**
   * Element on which the `pointermove` / `pointerup` listeners are attached.
   * Defaults to `window` so dragging keeps working when the pointer leaves the
   * element.
   *
   * @default window
   */
  draggingElement?: MaybeComputedElementRef | Window | Document;

  /**
   * Only start dragging when the pointer goes down on the `handle` itself, not
   * on one of its descendants.
   *
   * @default false
   */
  exact?: MaybeRefOrGetter<boolean>;

  /**
   * Pointer types that are allowed to start a drag.
   *
   * @default ['mouse', 'touch', 'pen']
   */
  pointerTypes?: UseDraggablePointerType[];

  /**
   * Pointer buttons that are allowed to start a drag (`0` = primary/left).
   *
   * @default [0]
   */
  buttons?: MaybeRefOrGetter<number[]>;

  /**
   * Call `preventDefault` on the pointer events. When `false` listeners are
   * attached passively for better scroll performance.
   *
   * @default false
   */
  preventDefault?: MaybeRefOrGetter<boolean>;

  /**
   * Call `stopPropagation` on the pointer events.
   *
   * @default false
   */
  stopPropagation?: MaybeRefOrGetter<boolean>;

  /**
   * Use event capture when attaching the listeners.
   *
   * @default true
   */
  capture?: boolean;

  /**
   * Disable dragging entirely. May be reactive to toggle at runtime.
   *
   * @default false
   */
  disabled?: MaybeRefOrGetter<boolean>;

  /**
   * Invoked when a drag starts. Return `false` to cancel the drag.
   */
  onStart?: (position: Position, event: PointerEvent) => void | false;

  /**
   * Invoked on every pointer move while dragging.
   */
  onMove?: (position: Position, event: PointerEvent) => void;

  /**
   * Invoked when the drag ends.
   */
  onEnd?: (position: Position, event: PointerEvent) => void;
}

export interface UseDraggableReturn {
  /**
   * Current x position.
   */
  x: Ref<number>;

  /**
   * Current y position.
   */
  y: Ref<number>;

  /**
   * Current position as a `{ x, y }` object.
   */
  position: Ref<Position>;

  /**
   * Whether a drag is currently in progress.
   */
  isDragging: ComputedRef<boolean>;

  /**
   * Ready-to-bind inline `style` string positioning the element.
   */
  style: ComputedRef<string>;
}

/**
 * @name useDraggable
 * @category Elements
 * @description Make an element draggable by pointer, tracking its position with
 * optional axis locking, a drag handle, container constraints, and lifecycle
 * callbacks. SSR-safe and built on passive pointer listeners.
 *
 * @param {MaybeComputedElementRef} target - The element to make draggable
 * @param {UseDraggableOptions} [options={}] - Options
 * @returns {UseDraggableReturn} Reactive `x`, `y`, `position`, `isDragging`, and a `style` string
 *
 * @example
 * const el = useTemplateRef<HTMLElement>('el');
 * const { x, y, style } = useDraggable(el, { initialValue: { x: 40, y: 40 } });
 *
 * @example
 * // Lock to the horizontal axis and only drag from a handle.
 * const { position } = useDraggable(el, { axis: 'x', handle: handleEl });
 *
 * @since 0.0.15
 */
export function useDraggable(
  target: MaybeComputedElementRef,
  options: UseDraggableOptions = {},
): UseDraggableReturn {
  const {
    initialValue,
    axis = 'both',
    handle = target,
    containerElement,
    draggingElement = defaultWindow,
    exact,
    pointerTypes,
    buttons = [0],
    preventDefault,
    stopPropagation,
    capture = true,
    disabled,
    onStart = noop,
    onMove = noop,
    onEnd = noop,
  } = options;

  const position = shallowRef<Position>(toValue(initialValue) ?? { x: 0, y: 0 });

  // Offset from the pointer to the element's top-left at drag start.
  // `null` means we are not dragging.
  const pressedDelta = shallowRef<Position | null>(null);

  const filterEvent = (event: PointerEvent): boolean => {
    if (pointerTypes)
      return pointerTypes.includes(event.pointerType as UseDraggablePointerType);
    return true;
  };

  const handleEvent = (event: PointerEvent): void => {
    if (toValue(preventDefault))
      event.preventDefault();
    if (toValue(stopPropagation))
      event.stopPropagation();
  };

  const start = (event: PointerEvent): void => {
    if (toValue(disabled))
      return;
    if (!toValue(buttons).includes(event.button))
      return;
    if (!filterEvent(event))
      return;

    const el = unrefElement(target) as HTMLElement | SVGElement | null | undefined;

    if (toValue(exact) && event.target !== el)
      return;

    const container = unrefElement(containerElement) as HTMLElement | SVGElement | null | undefined;
    const containerRect = container?.getBoundingClientRect();
    const targetRect = el?.getBoundingClientRect();

    if (!targetRect)
      return;

    const pos: Position = {
      x: event.clientX - (container ? targetRect.left - containerRect!.left + container.scrollLeft : targetRect.left),
      y: event.clientY - (container ? targetRect.top - containerRect!.top + container.scrollTop : targetRect.top),
    };

    if (onStart(pos, event) === false)
      return;

    pressedDelta.value = pos;
    handleEvent(event);
  };

  const move = (event: PointerEvent): void => {
    if (toValue(disabled))
      return;
    if (!pressedDelta.value)
      return;
    if (!filterEvent(event))
      return;

    const el = unrefElement(target) as HTMLElement | SVGElement | null | undefined;
    const container = unrefElement(containerElement) as HTMLElement | SVGElement | null | undefined;
    const targetRect = el?.getBoundingClientRect();

    let { x, y } = position.value;

    if (axis === 'x' || axis === 'both') {
      x = event.clientX - pressedDelta.value.x;
      if (container && targetRect)
        x = Math.min(Math.max(0, x), container.scrollWidth - targetRect.width);
    }

    if (axis === 'y' || axis === 'both') {
      y = event.clientY - pressedDelta.value.y;
      if (container && targetRect)
        y = Math.min(Math.max(0, y), container.scrollHeight - targetRect.height);
    }

    position.value = { x, y };
    onMove(position.value, event);
    handleEvent(event);
  };

  const end = (event: PointerEvent): void => {
    if (toValue(disabled))
      return;
    if (!pressedDelta.value)
      return;
    if (!filterEvent(event))
      return;

    pressedDelta.value = null;
    onEnd(position.value, event);
    handleEvent(event);
  };

  if (defaultWindow) {
    const config = (): AddEventListenerOptions => ({
      capture,
      passive: !toValue(preventDefault),
    });

    // `MaybeComputedElementRef` includes `VueInstance`, which isn't an `EventTarget`;
    // these targets always resolve to a real element/window at runtime (useEventListener
    // unwraps via unrefElement), so cast to the EventTarget overload.
    const asEventTarget = (value: unknown): MaybeRefOrGetter<EventTarget | null | undefined> =>
      value as MaybeRefOrGetter<EventTarget | null | undefined>;

    useEventListener(asEventTarget(handle), 'pointerdown', start as (e: Event) => void, config);
    useEventListener(asEventTarget(draggingElement), 'pointermove', move as (e: Event) => void, config);
    useEventListener(asEventTarget(draggingElement), 'pointerup', end as (e: Event) => void, config);
  }

  const x = computed<number>({
    get: () => position.value.x,
    set: value => (position.value = { x: value, y: position.value.y }),
  });

  const y = computed<number>({
    get: () => position.value.y,
    set: value => (position.value = { x: position.value.x, y: value }),
  });

  return {
    x,
    y,
    position,
    isDragging: computed(() => !!pressedDelta.value),
    style: computed(() => `left:${position.value.x}px;top:${position.value.y}px;`),
  };
}
