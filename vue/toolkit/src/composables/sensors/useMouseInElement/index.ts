import { shallowRef, watch } from 'vue';
import type { ShallowRef } from 'vue';
import { defaultWindow } from '@/types';
import { unrefElement } from '@/composables/component/unrefElement';
import type { MaybeComputedElementRef } from '@/composables/component/unrefElement';
import { useMouse } from '@/composables/sensors/useMouse';
import type { UseMouseOptions, UseMouseReturn } from '@/composables/sensors/useMouse';
import { useEventListener } from '@/composables/browser/useEventListener';
import { useElementBounding } from '@/composables/elements/useElementBounding';
import { tryOnMounted } from '@/composables/lifecycle/tryOnMounted';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

export interface UseMouseInElementOptions extends UseMouseOptions {
  /**
   * Keep tracking the mouse position relative to the element even while the
   * cursor is outside the element's bounds. When `false`, `elementX`/`elementY`
   * freeze at their last in-bounds value once the cursor leaves.
   *
   * @default true
   */
  handleOutside?: boolean;

  /**
   * Recalculate the element's position on window scroll.
   *
   * @default true
   */
  windowScroll?: boolean;

  /**
   * Recalculate the element's position on window resize.
   *
   * @default true
   */
  windowResize?: boolean;
}

export interface UseMouseInElementReturn extends UseMouseReturn {
  /**
   * Mouse X relative to the element's top-left corner
   */
  elementX: ShallowRef<number>;

  /**
   * Mouse Y relative to the element's top-left corner
   */
  elementY: ShallowRef<number>;

  /**
   * The element's X position (page coordinates for `type: 'page'`, otherwise
   * viewport coordinates)
   */
  elementPositionX: ShallowRef<number>;

  /**
   * The element's Y position (page coordinates for `type: 'page'`, otherwise
   * viewport coordinates)
   */
  elementPositionY: ShallowRef<number>;

  /**
   * The element's width
   */
  elementWidth: ShallowRef<number>;

  /**
   * The element's height
   */
  elementHeight: ShallowRef<number>;

  /**
   * Whether the cursor is currently outside the element's bounds
   */
  isOutside: ShallowRef<boolean>;

  /**
   * Stop all tracking (mouse listeners, element observers, watchers)
   */
  stop: () => void;
}

/**
 * @name useMouseInElement
 * @category Sensors
 * @description Reactive mouse position relative to an element. Exposes the
 * cursor position, the cursor position relative to the element's top-left
 * corner, the element's position and size, and whether the cursor is outside
 * the element. Element geometry is observed via `useElementBounding`
 * (`ResizeObserver` + `MutationObserver` + window scroll/resize), so the
 * relative coordinates stay correct as the element moves or resizes — without
 * re-measuring the element on every pointer move.
 *
 * @param {MaybeComputedElementRef} [target] Element to track against. Defaults to `document.body`.
 * @param {UseMouseInElementOptions} [options={}] Options
 * @returns {UseMouseInElementReturn} Reactive position/size refs and a `stop` function
 *
 * @example
 * const el = useTemplateRef<HTMLElement>('el');
 * const { elementX, elementY, isOutside } = useMouseInElement(el);
 *
 * @example
 * // Throttle pointer reads and stop tracking outside the element
 * const { elementX, elementY } = useMouseInElement(el, {
 *   handleOutside: false,
 *   eventFilter: throttleFilter(50),
 * });
 *
 * @since 0.0.15
 */
export function useMouseInElement(
  target?: MaybeComputedElementRef,
  options: UseMouseInElementOptions = {},
): UseMouseInElementReturn {
  const {
    handleOutside = true,
    windowScroll = true,
    windowResize = true,
    window = defaultWindow,
  } = options;

  const type = options.type ?? 'page';

  const { x, y, sourceType } = useMouse(options);

  // Resolve the tracked element lazily through a getter so the bounding observer
  // re-binds when the underlying ref/getter changes, and falls back to the body.
  const targetRef = (): Element | null | undefined =>
    (unrefElement(target as MaybeComputedElementRef) ?? window?.document?.body) as Element | null | undefined;

  // Delegate all element geometry tracking (resize/mutation/scroll/resize) to
  // useElementBounding. It batches reads and only re-measures when the element
  // actually changes — far cheaper than re-running getBoundingClientRect on
  // every mousemove like a naive implementation would.
  const {
    left,
    top,
    width: elementWidth,
    height: elementHeight,
    update: updateBounding,
  } = useElementBounding(targetRef, { windowScroll, windowResize, window });

  const elementX = shallowRef(0);
  const elementY = shallowRef(0);
  const elementPositionX = shallowRef(0);
  const elementPositionY = shallowRef(0);
  const isOutside = shallowRef(true);

  // `useElementBounding` reports viewport-relative coordinates. For `page`
  // coordinates (the default mouse type) we offset by the scroll position so the
  // element's position lives in the same coordinate space as the cursor.
  const usePageCoords = type === 'page';

  function update() {
    const scrollX = usePageCoords && window ? window.scrollX : 0;
    const scrollY = usePageCoords && window ? window.scrollY : 0;

    const posX = left.value + scrollX;
    const posY = top.value + scrollY;
    const w = elementWidth.value;
    const h = elementHeight.value;

    elementPositionX.value = posX;
    elementPositionY.value = posY;

    const elX = x.value - posX;
    const elY = y.value - posY;

    isOutside.value = w === 0 || h === 0
      || elX < 0 || elY < 0
      || elX > w || elY > h;

    if (handleOutside || !isOutside.value) {
      elementX.value = elX;
      elementY.value = elY;
    }
  }

  const stopWatch = watch(
    [x, y, left, top, elementWidth, elementHeight],
    update,
    { flush: 'sync' },
  );

  let stopLeave: (() => void) | undefined;

  if (window) {
    // A pointer that exits the window entirely never fires a final mousemove
    // inside the element, so flag it outside explicitly.
    stopLeave = useEventListener(
      window.document,
      'mouseleave',
      () => { isOutside.value = true; },
      { passive: true },
    );
  }

  function stop(): void {
    stopWatch();
    stopLeave?.();
  }

  tryOnMounted(() => {
    updateBounding();
    update();
  });

  tryOnScopeDispose(stop);

  return {
    x,
    y,
    sourceType,
    elementX,
    elementY,
    elementPositionX,
    elementPositionY,
    elementWidth,
    elementHeight,
    isOutside,
    stop,
  };
}
