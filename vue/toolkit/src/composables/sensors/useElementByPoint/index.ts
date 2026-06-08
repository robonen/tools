import { shallowRef, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter, ShallowRef } from 'vue';
import { defaultDocument } from '@/types';
import type { ConfigurableDocument, ResumableActions, ResumableOptions } from '@/types';
import { useRafFn } from '@/composables/animation/useRafFn';
import { useSupported } from '@/composables/utilities/useSupported';

export interface UseElementByPointOptions<Multiple extends boolean = false>
  extends ConfigurableDocument, ResumableOptions {
  /**
   * The x coordinate (relative to the viewport) to probe.
   */
  x: MaybeRefOrGetter<number>;

  /**
   * The y coordinate (relative to the viewport) to probe.
   */
  y: MaybeRefOrGetter<number>;

  /**
   * Return every element at the point (`elementsFromPoint`) instead of just the
   * topmost one (`elementFromPoint`).
   *
   * @default false
   */
  multiple?: MaybeRefOrGetter<Multiple>;
}

export type UseElementByPointValue<Multiple extends boolean>
  = Multiple extends true ? Element[] : Element | null;

export interface UseElementByPointReturn<Multiple extends boolean = false>
  extends ResumableActions {
  /**
   * Whether the underlying `elementFromPoint` / `elementsFromPoint` API is
   * available (SSR-safe).
   */
  isSupported: ComputedRef<boolean>;

  /**
   * The element(s) currently located at the configured point. Updated on every
   * animation frame while active.
   */
  element: ShallowRef<UseElementByPointValue<Multiple>>;
}

/**
 * @name useElementByPoint
 * @category Sensors
 * @description Reactive element(s) at a given viewport point, sampled every animation frame via `document.elementFromPoint` (or `elementsFromPoint` when `multiple` is set).
 *
 * @param {UseElementByPointOptions} options Probe coordinates and behaviour
 * @param {MaybeRefOrGetter<number>} options.x The x coordinate to probe
 * @param {MaybeRefOrGetter<number>} options.y The y coordinate to probe
 * @param {MaybeRefOrGetter<boolean>} [options.multiple=false] Return all elements at the point instead of the topmost
 * @param {boolean} [options.immediate=true] Start sampling immediately
 * @param {Document} [options.document=defaultDocument] Custom document instance
 * @returns {UseElementByPointReturn} `{ element, isSupported, pause, resume, toggle }`
 *
 * @example
 * const { x, y } = useMouse();
 * const { element } = useElementByPoint({ x, y });
 *
 * @example
 * const { element } = useElementByPoint({ x, y, multiple: true });
 *
 * @since 0.0.15
 */
export function useElementByPoint<Multiple extends boolean = false>(
  options: UseElementByPointOptions<Multiple>,
): UseElementByPointReturn<Multiple> {
  const {
    x,
    y,
    multiple,
    immediate = true,
    document = defaultDocument,
  } = options;

  const isSupported = useSupported(() => {
    if (!document)
      return false;

    return toValue(multiple)
      ? 'elementsFromPoint' in document
      : 'elementFromPoint' in document;
  });

  // `shallowRef` distributes over the conditional `UseElementByPointValue`, producing a
  // union of refs; collapse it back to a single ref of the resolved value type.
  const element = shallowRef(
    (toValue(multiple) ? [] : null) as UseElementByPointValue<Multiple>,
  ) as ShallowRef<UseElementByPointValue<Multiple>>;

  const { pause, resume, toggle } = useRafFn(() => {
    if (!document)
      return;

    if (toValue(multiple)) {
      if (typeof document.elementsFromPoint !== 'function')
        return;

      element.value = document.elementsFromPoint(toValue(x), toValue(y)) as UseElementByPointValue<Multiple>;
    }
    else {
      if (typeof document.elementFromPoint !== 'function')
        return;

      element.value = document.elementFromPoint(toValue(x), toValue(y)) as UseElementByPointValue<Multiple>;
    }
  }, { immediate });

  return {
    isSupported,
    element,
    pause,
    resume,
    toggle,
  };
}
