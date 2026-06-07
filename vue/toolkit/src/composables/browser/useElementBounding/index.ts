import { shallowRef, watch } from 'vue';
import type { Ref } from 'vue';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import type { MaybeComputedElementRef } from '@/composables/component/unrefElement';
import { unrefElement } from '@/composables/component/unrefElement';
import { useEventListener } from '@/composables/browser/useEventListener';
import { useResizeObserver } from '@/composables/browser/useResizeObserver';
import { useMutationObserver } from '@/composables/browser/useMutationObserver';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

export interface UseElementBoundingOptions extends ConfigurableWindow {
  /**
   * Reset values to 0 when the element is unmounted
   *
   * @default true
   */
  reset?: boolean;

  /**
   * Recalculate on window resize
   *
   * @default true
   */
  windowResize?: boolean;

  /**
   * Recalculate on window scroll
   *
   * @default true
   */
  windowScroll?: boolean;

  /**
   * Calculate immediately on mount
   *
   * @default true
   */
  immediate?: boolean;

  /**
   * When to recalculate the bounding box.
   *
   * - `'sync'` measures synchronously, the moment a trigger fires.
   * - `'next-frame'` defers measurement to the next animation frame. This
   *   batches bursts of triggers (e.g. rapid scroll/resize) into a single
   *   read per frame, avoiding repeated layout thrash from `getBoundingClientRect`.
   *
   * @default 'sync'
   */
  updateTiming?: 'sync' | 'next-frame';
}

export interface UseElementBoundingReturn {
  height: Ref<number>;
  width: Ref<number>;
  top: Ref<number>;
  right: Ref<number>;
  bottom: Ref<number>;
  left: Ref<number>;
  x: Ref<number>;
  y: Ref<number>;
  /**
   * Manually recalculate the bounding box, honouring `updateTiming`.
   */
  update: () => void;
}

/**
 * @name useElementBounding
 * @category Browser
 * @description Reactive bounding box of an element (`getBoundingClientRect`),
 * kept in sync via `ResizeObserver`, `MutationObserver`, and window scroll/resize.
 * Supports deferring reads to the next animation frame to avoid layout thrash.
 *
 * @param {MaybeComputedElementRef} target Element to measure
 * @param {UseElementBoundingOptions} [options={}] Options
 * @returns {UseElementBoundingReturn} Reactive bounds and a manual `update`
 *
 * @example
 * const { width, height, top, left } = useElementBounding(el);
 *
 * @example
 * // Batch rapid scroll/resize reads into one measurement per frame
 * const bounds = useElementBounding(el, { updateTiming: 'next-frame' });
 *
 * @since 0.0.15
 */
export function useElementBounding(
  target: MaybeComputedElementRef,
  options: UseElementBoundingOptions = {},
): UseElementBoundingReturn {
  const {
    reset = true,
    windowResize = true,
    windowScroll = true,
    immediate = true,
    updateTiming = 'sync',
    window = defaultWindow,
  } = options;

  const height = shallowRef(0);
  const width = shallowRef(0);
  const top = shallowRef(0);
  const right = shallowRef(0);
  const bottom = shallowRef(0);
  const left = shallowRef(0);
  const x = shallowRef(0);
  const y = shallowRef(0);

  function recalculate() {
    const el = unrefElement(target);

    if (!el) {
      if (reset) {
        height.value = 0;
        width.value = 0;
        top.value = 0;
        right.value = 0;
        bottom.value = 0;
        left.value = 0;
        x.value = 0;
        y.value = 0;
      }
      return;
    }

    const rect = el.getBoundingClientRect();

    height.value = rect.height;
    width.value = rect.width;
    top.value = rect.top;
    right.value = rect.right;
    bottom.value = rect.bottom;
    left.value = rect.left;
    x.value = rect.x;
    y.value = rect.y;
  }

  // Pending animation frame id, so deferred reads coalesce and can be cancelled.
  // `pending` is the source of truth for coalescing; `rafId` is only kept for
  // cancellation. A separate flag avoids ordering bugs when the scheduler runs
  // the callback synchronously (the assignment below would otherwise clobber the
  // id the callback just cleared).
  let pending = false;
  let rafId: number | undefined;

  function update() {
    if (updateTiming === 'next-frame' && window) {
      // Coalesce: only schedule one read per frame
      if (pending)
        return;

      pending = true;
      rafId = window.requestAnimationFrame(() => {
        pending = false;
        rafId = undefined;
        recalculate();
      });
      return;
    }

    recalculate();
  }

  useResizeObserver(target, update);
  watch(() => unrefElement(target), el => !el && update());
  useMutationObserver(target, update, { attributeFilter: ['style', 'class'] });

  if (windowScroll)
    useEventListener('scroll', update, { capture: true, passive: true });

  if (windowResize)
    useEventListener('resize', update, { passive: true });

  if (window && immediate)
    update();

  // Cancel any pending frame so we don't read a detached/disposed element
  tryOnScopeDispose(() => {
    if (pending && rafId !== undefined && window)
      window.cancelAnimationFrame(rafId);

    pending = false;
    rafId = undefined;
  });

  return {
    height,
    width,
    top,
    right,
    bottom,
    left,
    x,
    y,
    update,
  };
}
