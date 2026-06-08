import type { ComputedRef, MaybeRefOrGetter, Ref, ShallowRef, StyleValue } from 'vue';
import { computed, shallowRef, toValue, watch } from 'vue';
import { clamp, isNumber } from '@robonen/stdlib';
import { useElementSize } from '@/composables/elements/useElementSize';
import { useEventListener } from '@/composables/browser/useEventListener';

/**
 * Fixed pixel size or a per-index getter.
 */
export type UseVirtualListItemSize = number | ((index: number) => number);

export interface UseVirtualListOptionsBase {
  /**
   * Number of extra items rendered above and below the visible window to
   * reduce blank flashes while scrolling.
   *
   * @default 5
   */
  overscan?: number;
}

export interface UseHorizontalVirtualListOptions extends UseVirtualListOptionsBase {
  /**
   * Horizontal item size in pixels, or a getter `(index) => number`.
   */
  itemWidth: UseVirtualListItemSize;
}

export interface UseVerticalVirtualListOptions extends UseVirtualListOptionsBase {
  /**
   * Vertical item size in pixels, or a getter `(index) => number`.
   */
  itemHeight: UseVirtualListItemSize;
}

export type UseVirtualListOptions
  = | UseHorizontalVirtualListOptions
    | UseVerticalVirtualListOptions;

export interface UseVirtualListItem<T> {
  data: T;
  index: number;
}

export interface UseVirtualListScrollToOptions {
  behavior?: ScrollBehavior;
  block?: ScrollLogicalPosition;
  inline?: ScrollLogicalPosition;
}

export interface UseVirtualListContainerProps {
  ref: ShallowRef<HTMLElement | null>;
  onScroll: () => void;
  style: StyleValue;
}

export interface UseVirtualListWrapperStyle {
  width: string;
  height: string;
  marginTop?: string;
  marginLeft?: string;
  display?: string;
}

export interface UseVirtualListReturn<T> {
  /**
   * The currently visible slice (with original indices) to render.
   */
  list: Ref<Array<UseVirtualListItem<T>>>;
  /**
   * Scroll the container so the item at `index` becomes visible.
   */
  scrollTo: (index: number, options?: UseVirtualListScrollToOptions) => void;
  /**
   * Props to bind on the scrolling container element.
   */
  containerProps: UseVirtualListContainerProps;
  /**
   * Reactive props to bind on the inner wrapper element (spacer offsets).
   */
  wrapperProps: ComputedRef<{ style: UseVirtualListWrapperStyle }>;
}

interface UseVirtualListState {
  start: number;
  end: number;
}

type Axis = 'horizontal' | 'vertical';

const scrollKey = {
  horizontal: 'scrollLeft',
  vertical: 'scrollTop',
} as const;

const scrollToKey = {
  horizontal: 'left',
  vertical: 'top',
} as const;

const defaultScrollToOptions: UseVirtualListScrollToOptions = {
  behavior: 'auto',
  block: 'start',
  inline: 'nearest',
};

interface UseVirtualListMetrics {
  /** Cumulative offset before the item at `index` (i.e. distance from the start). */
  distance: (index: number) => number;
  /** Total size of every item. */
  total: () => number;
  /** How many items fit, starting at `start`, inside `containerSize`. */
  viewCapacity: (containerSize: number, start: number) => number;
  /** Index of the first item whose cumulative span reaches `scrollPos`. */
  offset: (scrollPos: number) => number;
  /** Size of a single item. */
  size: (index: number) => number;
}

/**
 * Build size metrics for the current source.
 *
 * For a fixed numeric `itemSize` everything is O(1) arithmetic. For a getter
 * we precompute a prefix-sum table once per (source, itemSize) change so that
 * `distance`, `total`, `offset`, and `viewCapacity` are O(1)/O(log n) lookups
 * instead of re-reducing the whole array on every scroll frame.
 */
function createMetrics(length: number, itemSize: UseVirtualListItemSize): UseVirtualListMetrics {
  if (isNumber(itemSize)) {
    const fixed = itemSize;
    return {
      size: () => fixed,
      distance: index => clamp(index, 0, length) * fixed,
      total: () => length * fixed,
      viewCapacity: containerSize => Math.ceil(containerSize / fixed),
      offset: scrollPos => Math.floor(scrollPos / fixed),
    };
  }

  // prefix[i] = sum of sizes of items [0, i); prefix[length] = total size.
  const prefix = new Float64Array(length + 1);
  for (let i = 0; i < length; i++)
    prefix[i + 1] = prefix[i]! + itemSize(i);

  const total = prefix[length]!;

  // Largest index whose cumulative offset is <= target, via binary search.
  const lowerBound = (target: number): number => {
    let lo = 0;
    let hi = length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (prefix[mid]! <= target)
        lo = mid + 1;
      else
        hi = mid;
    }
    return lo - 1;
  };

  return {
    size: index => itemSize(index),
    distance: index => prefix[clamp(index, 0, length)]!,
    total: () => total,
    viewCapacity: (containerSize, start) => {
      const target = prefix[clamp(start, 0, length)]! + containerSize;
      const end = lowerBound(target);
      return Math.max(0, end - start + 1);
    },
    offset: scrollPos => Math.max(0, lowerBound(scrollPos)),
  };
}

/**
 * @name useVirtualList
 * @category Component
 * @description Virtualize a large list so only the items inside (and slightly
 * around) the viewport are rendered. Supports vertical (`itemHeight`) and
 * horizontal (`itemWidth`) layouts, fixed or per-index sizes, and an `overscan`
 * buffer. Backed by `useElementSize` (reactive container size) and
 * `useEventListener` (passive, auto-cleaned scroll handling). SSR-safe: renders
 * an empty window until the container mounts.
 *
 * @param {MaybeRefOrGetter<readonly T[]>} list The full source array (may be reactive)
 * @param {UseVirtualListOptions} options Layout options — supply `itemHeight` (vertical) or `itemWidth` (horizontal), plus optional `overscan`
 * @returns {UseVirtualListReturn<T>} `{ list, containerProps, wrapperProps, scrollTo }`
 *
 * @example
 * const all = ref(Array.from({ length: 99999 }, (_, i) => i));
 * const { list, containerProps, wrapperProps, scrollTo } = useVirtualList(all, { itemHeight: 22 });
 * // <div v-bind="containerProps" style="height: 300px">
 * //   <div v-bind="wrapperProps">
 * //     <div v-for="{ data, index } in list" :key="index" style="height: 22px">{{ data }}</div>
 * //   </div>
 * // </div>
 *
 * @example
 * // Variable heights and a wider overscan buffer.
 * const { list } = useVirtualList(items, { itemHeight: i => (i % 2 ? 40 : 80), overscan: 10 });
 *
 * @since 0.0.15
 */
export function useVirtualList<T = any>(
  list: MaybeRefOrGetter<readonly T[]>,
  options: UseVirtualListOptions,
): UseVirtualListReturn<T> {
  const isVertical = 'itemHeight' in options;
  const axis: Axis = isVertical ? 'vertical' : 'horizontal';
  const itemSize = isVertical
    ? (options as UseVerticalVirtualListOptions).itemHeight
    : (options as UseHorizontalVirtualListOptions).itemWidth;
  const overscan = options.overscan ?? 5;

  const containerRef = shallowRef<HTMLElement | null>(null);
  const size = useElementSize(containerRef);
  const source = computed(() => toValue(list));

  const currentList = shallowRef<Array<UseVirtualListItem<T>>>([]);
  const state = shallowRef<UseVirtualListState>({ start: 0, end: overscan });

  // Recompute metrics only when the source length or item-size strategy changes.
  const metrics = computed(() => createMetrics(source.value.length, itemSize));

  const calculateRange = (): void => {
    const element = containerRef.value;
    if (!element)
      return;

    const m = metrics.value;
    const len = source.value.length;
    const scrollPos = axis === 'vertical' ? element.scrollTop : element.scrollLeft;
    const containerSize = axis === 'vertical' ? element.clientHeight : element.clientWidth;

    const offset = m.offset(scrollPos);
    const viewCapacity = m.viewCapacity(containerSize, offset);

    const start = clamp(offset - overscan, 0, len);
    const end = clamp(offset + viewCapacity + overscan, 0, len);

    state.value = { start, end };

    const view: Array<UseVirtualListItem<T>> = [];
    for (let i = start; i < end; i++)
      view.push({ data: source.value[i]!, index: i });
    currentList.value = view;
  };

  // Re-slice when the viewport size, the source, or the mounted element changes.
  watch(
    [size.width, size.height, source, containerRef],
    calculateRange,
    { flush: 'post' },
  );

  // Passive scroll listener with automatic cleanup and reactive re-binding.
  useEventListener(containerRef, 'scroll', calculateRange, { passive: true });

  const offsetStart = computed(() => metrics.value.distance(state.value.start));
  const totalSize = computed(() => metrics.value.total());

  const wrapperProps = computed((): { style: UseVirtualListWrapperStyle } => {
    if (axis === 'vertical') {
      return {
        style: {
          width: '100%',
          height: `${totalSize.value - offsetStart.value}px`,
          marginTop: `${offsetStart.value}px`,
        },
      };
    }
    return {
      style: {
        height: '100%',
        width: `${totalSize.value - offsetStart.value}px`,
        marginLeft: `${offsetStart.value}px`,
        display: 'flex',
      },
    };
  });

  const containerStyle: StyleValue = isVertical
    ? { overflowY: 'auto' }
    : { overflowX: 'auto' };

  const scrollTo = (index: number, scrollOptions?: UseVirtualListScrollToOptions): void => {
    const element = containerRef.value;
    if (!element)
      return;

    const resolved = { ...defaultScrollToOptions, ...scrollOptions };
    const m = metrics.value;

    let offset = 0;
    const align = axis === 'horizontal' ? resolved.inline : resolved.block;
    if (align) {
      const containerSize = axis === 'vertical' ? element.clientHeight : element.clientWidth;
      const fullItemSize = m.size(index);
      if (align === 'center')
        offset = containerSize / 2 - fullItemSize / 2;
      else if (align === 'end')
        offset = containerSize - fullItemSize;
      else if (align === 'nearest' && m.distance(index) > element[scrollKey[axis]] + containerSize / 2)
        offset = containerSize - fullItemSize;
    }

    element.scrollTo({
      [scrollToKey[axis]]: m.distance(index) - offset,
      behavior: resolved.behavior,
    });
    calculateRange();
  };

  const containerProps: UseVirtualListContainerProps = {
    ref: containerRef,
    onScroll: calculateRange,
    style: containerStyle,
  };

  return {
    list: currentList,
    scrollTo,
    containerProps,
    wrapperProps,
  };
}
