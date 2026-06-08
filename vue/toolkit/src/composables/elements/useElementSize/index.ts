import { computed, shallowRef, watch } from 'vue';
import type { ShallowRef } from 'vue';
import { toArray } from '@robonen/stdlib';
import type { ConfigurableWindow } from '@/types';
import { defaultWindow } from '@/types';
import type { MaybeComputedElementRef } from '@/composables/component/unrefElement';
import { unrefElement } from '@/composables/component/unrefElement';
import { useResizeObserver } from '@/composables/elements/useResizeObserver';
import type { UseResizeObserverOptions } from '@/composables/elements/useResizeObserver';
import { tryOnMounted } from '@/composables/lifecycle/tryOnMounted';

export interface ElementSize {
  width: number;
  height: number;
}

export interface UseElementSizeOptions extends UseResizeObserverOptions, ConfigurableWindow {}

export interface UseElementSizeReturn {
  width: ShallowRef<number>;
  height: ShallowRef<number>;
  stop: () => void;
}

/**
 * @name useElementSize
 * @category Elements
 * @description Reactive size of an element, backed by `ResizeObserver`.
 * Measures synchronously on mount, handles SVG elements via `getBoundingClientRect`,
 * and sums multiple box fragments (e.g. multi-column layouts).
 *
 * @param {MaybeComputedElementRef} target Element to measure (ref, getter, or component instance)
 * @param {ElementSize} [initialSize={ width: 0, height: 0 }] Initial size, restored when the element detaches
 * @param {UseElementSizeOptions} [options={}] Options forwarded to `ResizeObserver` (`box`, `window`)
 * @returns {UseElementSizeReturn} Reactive `width`, `height`, and a `stop` handle
 *
 * @example
 * const el = useTemplateRef('el');
 * const { width, height } = useElementSize(el);
 *
 * @example
 * const { width, height, stop } = useElementSize(el, { width: 100, height: 100 }, { box: 'border-box' });
 *
 * @since 0.0.15
 */
export function useElementSize(
  target: MaybeComputedElementRef,
  initialSize: ElementSize = { width: 0, height: 0 },
  options: UseElementSizeOptions = {},
): UseElementSizeReturn {
  const { window = defaultWindow, box = 'content-box' } = options;

  const width = shallowRef(initialSize.width);
  const height = shallowRef(initialSize.height);

  const isSVG = computed(() => unrefElement(target)?.namespaceURI?.includes('svg'));

  const { stop: stopObserver } = useResizeObserver(target, ([entry]) => {
    if (!entry)
      return;

    // SVG elements report unreliable box sizes in some browsers; measure the layout box instead.
    if (window && isSVG.value) {
      const el = unrefElement(target);
      if (el) {
        const rect = el.getBoundingClientRect();
        width.value = rect.width;
        height.value = rect.height;
      }
      return;
    }

    const boxSize = box === 'border-box'
      ? entry.borderBoxSize
      : box === 'content-box'
        ? entry.contentBoxSize
        : entry.devicePixelContentBoxSize;

    if (boxSize) {
      // Normalise the cross-browser `ResizeObserverSize | ReadonlyArray<ResizeObserverSize>` shape
      // and sum fragments (e.g. multi-column layouts) in a single pass.
      let nextWidth = 0;
      let nextHeight = 0;
      for (const size of toArray(boxSize as ResizeObserverSize | ResizeObserverSize[])) {
        nextWidth += size.inlineSize;
        nextHeight += size.blockSize;
      }
      width.value = nextWidth;
      height.value = nextHeight;
    }
    else {
      width.value = entry.contentRect.width;
      height.value = entry.contentRect.height;
    }
  }, options);

  // Provide a measurement immediately on mount, before the first observer callback fires.
  tryOnMounted(() => {
    const el = unrefElement(target);
    if (el) {
      width.value = 'offsetWidth' in el ? (el as HTMLElement).offsetWidth : initialSize.width;
      height.value = 'offsetHeight' in el ? (el as HTMLElement).offsetHeight : initialSize.height;
    }
  });

  // Reset to the initial size when the element is attached/detached.
  const stopWatch = watch(
    () => unrefElement(target),
    (el) => {
      width.value = el ? initialSize.width : 0;
      height.value = el ? initialSize.height : 0;
    },
  );

  const stop = (): void => {
    stopObserver();
    stopWatch();
  };

  return { width, height, stop };
}
