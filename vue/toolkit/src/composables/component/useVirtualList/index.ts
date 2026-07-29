import type { CSSProperties, ComputedRef, MaybeRefOrGetter, ShallowRef } from 'vue';
import { computed, nextTick, shallowRef, toValue, watch } from 'vue';
import { FenwickTree, clamp, isNumber } from '@robonen/stdlib';
import { useEventListener } from '@/composables/browser/useEventListener';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

// ─── Types ───────────────────────────────────────────────────────────────────

export type UseVirtualListAlign = 'start' | 'center' | 'end' | 'auto';

export interface UseVirtualListScrollToOptions {
  /**
   * Alignment of the target item inside the viewport. `'auto'` uses
   * nearest-edge semantics: scroll only if the item is not fully visible.
   *
   * @default 'auto'
   */
  align?: UseVirtualListAlign;
  /**
   * Native scroll behavior. With dynamic sizes `'smooth'` is best-effort:
   * offsets shift as newly revealed items get measured mid-animation.
   */
  behavior?: ScrollBehavior;
}

export interface UseVirtualListItemProps {
  /**
   * Measures the row: bind the whole object with `v-bind="item.props"`.
   * Works on plain elements and on components with a single root element
   * (resolved through the instance's `$el`); fragment-rooted components
   * cannot be measured and trigger a dev warning.
   */
  ref: (el: unknown) => void;
  /** Lets the ResizeObserver map an element back to its index. */
  'data-index': number;
  style: CSSProperties;
}

export interface UseVirtualListItem<T> {
  data: T;
  index: number;
  /** Result of `getItemKey` — use as `:key`. */
  key: PropertyKey;
  /** Offset of the item start from the wrapper start, px. */
  start: number;
  /** Current size: measured if the row was ever rendered, estimate otherwise, px. */
  size: number;
  end: number;
  /**
   * Spread onto the row root: `v-bind="item.props"`.
   *
   * A `v-bind` spread puts the element on Vue's FULL_PROPS diff path; with
   * three props that is cheap, but perf-critical consumers can opt into the
   * faster PROPS path by binding explicitly:
   * `:ref="item.props.ref" :data-index="item.index" :style="item.props.style"`.
   * Avoid spreading onto a row *component*: there FULL_PROPS also means a full
   * props diff plus an attrs-fallthrough `cloneVNode` of its root on every
   * render — keep the row root a plain element, or set `inheritAttrs: false`
   * and bind explicitly.
   */
  props: UseVirtualListItemProps;
}

export interface UseVirtualListRange {
  start: number;
  end: number;
}

export interface UseVirtualListOptions<T> {
  /**
   * Size (px) assumed for an item until it is measured, or a getter
   * `(item, index) => number`. A data-driven estimate keeps the first paint
   * and the scrollbar close to the truth and minimizes anchoring corrections.
   *
   * @default 48
   */
  estimateSize?: number | ((item: T, index: number) => number);
  /**
   * Scroll axis. Horizontal mode assumes LTR writing direction.
   *
   * @default 'y'
   */
  axis?: 'x' | 'y';
  /**
   * Number of extra items rendered above and below the visible window to
   * reduce blank flashes while scrolling.
   *
   * @default 5
   */
  overscan?: number;
  /**
   * Stable identity for an item. Measured sizes are cached by this key, so
   * they survive prepends, removals and reorders — and the scroll position
   * is re-anchored to the same item when the list shifts. Defaults to the
   * index, which is only correct for append-only lists.
   */
  getItemKey?: (item: T, index: number) => PropertyKey;
  /**
   * Virtual gap between items (px) — pure layout, never measured.
   *
   * @default 0
   */
  gap?: number;
  /**
   * Leading padding inside the wrapper, px.
   *
   * @default 0
   */
  paddingStart?: number;
  /**
   * Trailing padding inside the wrapper, px.
   *
   * @default 0
   */
  paddingEnd?: number;
  /**
   * External scroll container. When omitted, bind `containerProps`
   * (or `containerRef`) to your own element. Whatever the wiring path,
   * `overflow-anchor: none` is applied to the element on attach; the
   * `overflow` itself is only set by `containerProps`.
   */
  scrollElement?: MaybeRefOrGetter<HTMLElement | null | undefined>;
  /**
   * Offset (px) of the wrapper start from the scroll container's content
   * start — for scrollers that render other content before the list.
   *
   * @default 0
   */
  scrollMargin?: number;
  /**
   * Viewport size (px) assumed before the container is measured.
   * Lets SSR / the first client render emit the initial window of items
   * instead of an empty list.
   *
   * @default 0
   */
  initialContainerSize?: number;
  /**
   * Index to scroll to (aligned to `'start'`) once both the scroll element
   * and a non-empty source are available — safe with async-loaded data.
   */
  initialScrollIndex?: number;
  /**
   * Keep the visual position stable when items above the viewport are
   * measured to a different size, and when the list is prepended to.
   *
   * @default true
   */
  anchorScroll?: boolean;
  /**
   * Chat mode: when the viewport is at the very end and items are appended,
   * keep it pinned to the end instead of anchoring to the first visible row.
   *
   * @default false
   */
  followOutput?: boolean;
  /**
   * ms of scroll silence before `isScrolling` resets. `0` disables.
   *
   * @default 150
   */
  scrollingDelay?: number;
}

export interface UseVirtualListContainerProps {
  ref: ShallowRef<HTMLElement | null>;
  style: CSSProperties;
}

export interface UseVirtualListReturn<T> {
  /**
   * Items in the current window, with layout offsets and spreadable props.
   */
  list: ComputedRef<Array<UseVirtualListItem<T>>>;
  /**
   * Full content size along the scroll axis (paddings and gaps included), px.
   */
  totalSize: ComputedRef<number>;
  /**
   * Current rendered index window `[start, end)`, overscan included.
   */
  range: Readonly<ShallowRef<UseVirtualListRange>>;
  isScrolling: Readonly<ShallowRef<boolean>>;
  /**
   * Scroll container element — bind via `containerProps` or use directly.
   */
  containerRef: ShallowRef<HTMLElement | null>;
  /**
   * Props to bind on the scrolling container element.
   */
  containerProps: UseVirtualListContainerProps;
  /**
   * Reactive props to bind on the inner wrapper (sizer) element.
   */
  wrapperProps: ComputedRef<{ style: CSSProperties }>;
  /**
   * Row measurer — already wired into `item.props.ref`; exposed for custom layouts.
   */
  measureElement: (el: unknown) => void;
  /**
   * Scroll the container so the item at `index` satisfies the alignment.
   */
  scrollTo: (index: number, options?: UseVirtualListScrollToOptions) => void;
  scrollToOffset: (offset: number, options?: { behavior?: ScrollBehavior }) => void;
  /**
   * Scroll offset that would satisfy `align` for `index`.
   * Reflects the layout as of the last flush (does not force a re-sync).
   */
  getOffsetForIndex: (index: number, align?: UseVirtualListAlign) => number;
  /**
   * Re-read the source and rebuild layout. Only needed after *in-place*
   * mutation of the source array (`watch` cannot observe those) — replacing
   * the array triggers this automatically, and `scrollTo` re-syncs a
   * same-tick replacement on its own.
   */
  updateLayout: () => void;
  /**
   * Drop cached measurements (all, or one index) and re-measure live rows.
   * Useful when row content changes without a resize the observer would see.
   */
  remeasure: (index?: number) => void;
}

// ─── Composable ──────────────────────────────────────────────────────────────

/** Ignore sub-0.01px deltas: fractional-zoom noise, not real resizes. */
const SIZE_EPSILON = 0.01;

/**
 * @name useVirtualList
 * @category Component
 * @description Virtualize a large list with dynamically measured item sizes.
 * Rows render at their natural size: layout starts from `estimateSize` and is
 * corrected by a shared ResizeObserver, which fires after layout but before
 * paint, so corrections are not visible as flicker. Offsets come from a
 * Fenwick tree (O(log n) hot paths). When an item above the viewport changes
 * size — or the list is prepended to — the scroll position is compensated so
 * content does not jump; the compensation write is deferred until after the
 * DOM patch (still pre-paint) so it is never clamped by a stale wrapper
 * height. Supports vertical and horizontal (LTR) layouts, `gap`/paddings,
 * an external `scrollElement`, `followOutput` chat pinning, `scrollTo` with
 * nearest-edge `'auto'` alignment, and SSR via `initialContainerSize`.
 *
 * Non-goals (by design): window as scroller (element scrollers only),
 * RTL horizontal mode, reactive options (only the source and `scrollElement`
 * are reactive), pixel-perfect `behavior: 'smooth'` landings.
 *
 * @param {MaybeRefOrGetter<readonly T[]>} source The full source array (may be reactive)
 * @param {UseVirtualListOptions<T>} options Layout and behavior options
 * @returns {UseVirtualListReturn<T>} `{ list, totalSize, range, isScrolling, containerRef, containerProps, wrapperProps, measureElement, scrollTo, scrollToOffset, getOffsetForIndex, updateLayout, remeasure }`
 *
 * @example
 * const messages = shallowRef<Message[]>([]);
 * const { list, containerProps, wrapperProps } = useVirtualList(messages, {
 *   estimateSize: m => 52 + Math.ceil(m.text.length / 80) * 20,
 *   getItemKey: m => m.id, // measurements survive prepend/reorder
 *   followOutput: true,    // stay pinned to the newest message
 * });
 * // <div v-bind="containerProps" style="height: 300px">
 * //   <div v-bind="wrapperProps">
 * //     <article v-for="item in list" :key="item.key" v-bind="item.props">
 * //       {{ item.data.text }} <!-- natural height, measured automatically -->
 * //     </article>
 * //   </div>
 * // </div>
 *
 * @example
 * // Fixed-size grid rows: the estimate is exact, measurement never corrects.
 * const { list } = useVirtualList(items, { estimateSize: 44, overscan: 10 });
 *
 * @since 0.0.14
 */
export function useVirtualList<T = unknown>(
  source: MaybeRefOrGetter<readonly T[]>,
  options: UseVirtualListOptions<T> = {},
): UseVirtualListReturn<T> {
  const {
    estimateSize = 48,
    axis = 'y',
    overscan = 5,
    getItemKey = (_item, index) => index,
    gap = 0,
    paddingStart = 0,
    paddingEnd = 0,
    scrollElement,
    scrollMargin = 0,
    initialContainerSize = 0,
    initialScrollIndex,
    anchorScroll = true,
    followOutput = false,
    scrollingDelay = 150,
  } = options;

  const horizontal = axis === 'x';
  const scrollProp = horizontal ? 'scrollLeft' as const : 'scrollTop' as const;
  const clientProp = horizontal ? 'clientWidth' as const : 'clientHeight' as const;

  const estimate: (item: T, index: number) => number
    = isNumber(estimateSize) ? () => estimateSize : estimateSize;

  const containerRef = shallowRef<HTMLElement | null>(null);
  const getScrollEl = (): HTMLElement | null =>
    scrollElement !== undefined ? toValue(scrollElement) ?? null : containerRef.value;

  // ─── State ─────────────────────────────────────────────────────────────────
  // Hot data lives outside the reactivity system: the scroll handler and the
  // ResizeObserver touch it at pixel/frame frequency. Renders are driven by
  // exactly two coarse signals: `range` (window moved), `version` (layout changed).

  let items: readonly T[] = [];
  let count = 0;
  let sizes = new Float64Array(0);
  let keys: PropertyKey[] = [];
  let keyToIndex = new Map<PropertyKey, number>();
  let tree = new FenwickTree(0);
  const measured = new Map<PropertyKey, number>();

  let scrollOffset = 0;
  let viewport = initialContainerSize;

  const version = shallowRef(0);
  const range = shallowRef<UseVirtualListRange>({ start: 0, end: 0 });
  const isScrolling = shallowRef(false);

  let pendingChanged = false; // some size/offset changed since the last flush
  let viewportChanged = false; // container resized — range-only recompute
  let anchorSuppressed = false; // smooth programmatic scroll in flight
  let programmaticOffset = -1; // echo marker for our own compensation writes
  let chaseTarget = -1; // last offset written by the scrollTo chase
  let pendingScrollTarget = -1; // deferred compensation target, -1 = none
  let scrollToRaf = 0;
  let disposed = false;
  let didInitialScroll = initialScrollIndex === undefined;
  let warnedNonElement = false;
  let scrollingTimer: ReturnType<typeof setTimeout> | undefined;
  let smoothTimer: ReturnType<typeof setTimeout> | undefined;

  // ─── Geometry ──────────────────────────────────────────────────────────────

  /** Item start in wrapper coordinates (paddingStart and gaps included). */
  function offsetOf(index: number): number {
    return paddingStart + tree.prefix(index) + index * gap;
  }

  function contentSize(): number {
    if (count === 0)
      return paddingStart + paddingEnd;
    return paddingStart + tree.prefix(count) + (count - 1) * gap + paddingEnd;
  }

  function updateRange(): void {
    if (count === 0) {
      if (range.value.start !== 0 || range.value.end !== 0)
        range.value = { start: 0, end: 0 };
      return;
    }
    const top = scrollOffset - scrollMargin - paddingStart;
    const first = tree.lowerBound(top, gap);
    const last = tree.lowerBound(top + viewport, gap) + 1;
    const start = clamp(first - overscan, 0, count - 1);
    const end = clamp(last + overscan, start + 1, count);
    const current = range.value;
    if (current.start !== start || current.end !== end)
      range.value = { start, end };
  }

  // ─── Render output ─────────────────────────────────────────────────────────
  // Declared before the watches below: their `immediate` callbacks can reach
  // `scrollTo` → `totalSize` while `const` computeds are still in TDZ otherwise.

  const totalSize = computed(() => {
    void version.value;
    return contentSize();
  });

  const list = computed<Array<UseVirtualListItem<T>>>(() => {
    void version.value;
    const { start, end } = range.value;
    const result: Array<UseVirtualListItem<T>> = [];
    if (start >= end)
      return result;
    // one O(log n) prefix, then O(1) accumulation per row
    let offset = offsetOf(start);
    for (let i = start; i < end; i++) {
      const size = sizes[i]!;
      result.push({
        data: items[i]!,
        index: i,
        key: keys[i]!,
        start: offset,
        size,
        end: offset + size,
        props: {
          ref: measureElement,
          'data-index': i,
          style: horizontal
            ? { position: 'absolute', top: 0, left: 0, height: '100%', transform: `translateX(${offset}px)` }
            : { position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${offset}px)` },
        },
      });
      offset += size + gap;
    }
    return result;
  });

  // `overflow-anchor: none` — native scroll anchoring would double-correct on
  // top of our own compensation. On platforms with classic scrollbars consider
  // also adding `scrollbar-gutter: stable` to avoid threshold reflow loops.
  const containerProps: UseVirtualListContainerProps = {
    ref: containerRef,
    style: {
      overflowAnchor: 'none',
      ...(horizontal ? { overflowX: 'auto' } : { overflowY: 'auto' }),
    } as CSSProperties,
  };

  const wrapperProps = computed(() => ({
    style: (horizontal
      ? { position: 'relative', width: `${totalSize.value}px`, height: '100%' }
      : { position: 'relative', height: `${totalSize.value}px`, width: '100%' }) as CSSProperties,
  }));

  // ─── Measurement ───────────────────────────────────────────────────────────

  let observer: ResizeObserver | undefined;

  // Live row elements by item key: a remount under the same key evicts the
  // stale node, KeepAlive-detached rows stay observed while cached, and
  // out-of-window disconnected entries are swept after each patch.
  const elements = new Map<PropertyKey, HTMLElement>();

  function ensureObserver(): ResizeObserver | undefined {
    if (!observer && typeof ResizeObserver !== 'undefined')
      observer = new ResizeObserver(onResizeEntries);
    return observer;
  }

  function readSize(entry: ResizeObserverEntry): number {
    const box = entry.borderBoxSize?.[0];
    if (box)
      return horizontal ? box.inlineSize : box.blockSize;
    const rect = entry.target.getBoundingClientRect();
    return horizontal ? rect.width : rect.height;
  }

  /** Record a new size for `index`; returns the applied delta (0 if below epsilon). */
  function commitSize(index: number, size: number, cache = true): number {
    const delta = size - sizes[index]!;
    if (Math.abs(delta) < SIZE_EPSILON)
      return 0;
    sizes[index] = size;
    if (cache)
      measured.set(keys[index]!, size);
    tree.update(index, delta);
    pendingChanged = true;
    return delta;
  }

  // Only items starting above the viewport top shift visible content; `adjust`
  // folds in compensation from earlier entries of the same batch so late ones
  // are classified against the final geometry.
  function anchorContribution(index: number, delta: number, adjust: number): number {
    if (delta === 0 || !anchorScroll || anchorSuppressed)
      return 0;
    return offsetOf(index) + scrollMargin < scrollOffset + adjust ? delta : 0;
  }

  function onResizeEntries(entries: ResizeObserverEntry[]): void {
    const scroller = getScrollEl();
    let adjust = 0;
    for (const entry of entries) {
      const target = entry.target as HTMLElement;
      if (target === scroller) {
        const next = scroller[clientProp];
        if (next !== viewport) {
          viewport = next;
          viewportChanged = true;
        }
        continue;
      }
      if (!target.isConnected)
        continue; // lifecycle is owned by the keyed registry + sweep
      const index = Number(target.dataset.index);
      if (!Number.isInteger(index) || index < 0 || index >= count)
        continue;
      const delta = commitSize(index, readSize(entry));
      adjust += anchorContribution(index, delta, adjust);
    }
    flushSizeChanges(adjust);
  }

  function measureElement(el: unknown): void {
    if (!el || typeof el !== 'object')
      return;
    // component instance (or its expose proxy) resolves through $el
    const node = ('nodeType' in el ? el : (el as { $el?: unknown }).$el) as HTMLElement | null | undefined;
    if (!node || node.nodeType !== 1) {
      if (!warnedNonElement) {
        warnedNonElement = true;
        console.warn(
          '[useVirtualList] item.props.ref did not resolve to a DOM element — the row will keep its '
          + 'estimated size. Bind item.props to a plain element or a component with a single root element.',
        );
      }
      return;
    }
    const ro = ensureObserver();
    if (!ro)
      return;
    const index = Number(node.dataset.index);
    if (!Number.isInteger(index) || index < 0 || index >= count)
      return;
    const key = keys[index]!;
    const previous = elements.get(key);
    if (previous === node)
      return;
    if (previous)
      ro.unobserve(previous);
    elements.set(key, node);
    ro.observe(node, { box: 'border-box' });
  }

  // RO only fires when a size *changes* — after dropping a cached measurement
  // the estimate would stick for already-rendered rows, so re-read them by hand.
  function syncLiveElements(only?: number): void {
    let adjust = 0;
    const commitNode = (node: HTMLElement): void => {
      if (!node.isConnected)
        return;
      const index = Number(node.dataset.index);
      if (!Number.isInteger(index) || index < 0 || index >= count)
        return;
      const rect = node.getBoundingClientRect();
      const delta = commitSize(index, horizontal ? rect.width : rect.height);
      adjust += anchorContribution(index, delta, adjust);
    };
    if (only !== undefined) {
      const node = elements.get(keys[only]!);
      if (node)
        commitNode(node);
    }
    else {
      for (const node of elements.values())
        commitNode(node);
    }
    flushSizeChanges(adjust);
  }

  // Sweep after each DOM patch: disconnected entries still inside the window
  // are kept (KeepAlive cache / v-if — a remount replaces them by key).
  watch([range, version], () => {
    if (elements.size === 0)
      return;
    const { start, end } = range.value;
    for (const [key, node] of elements) {
      if (node.isConnected)
        continue;
      const index = keyToIndex.get(key);
      if (index === undefined || index < start || index >= end) {
        observer?.unobserve(node);
        elements.delete(key);
      }
    }
  }, { flush: 'post' });

  // ─── Scroll compensation ───────────────────────────────────────────────────

  // Compensation writes must land AFTER the DOM patch: the wrapper still has
  // its old size here, so an immediate write could be clamped by the stale
  // scrollHeight. nextTick runs after the render flush but before paint.
  // `behavior: 'instant'` bypasses any `scroll-behavior: smooth` CSS on the
  // scroller, which would animate the correction and desync `scrollOffset`.
  function requestScrollWrite(target: number): void {
    const schedule = pendingScrollTarget < 0;
    pendingScrollTarget = target;
    scrollOffset = target; // optimistic: keep layout math consistent pre-flush
    if (!schedule)
      return;
    nextTick(() => {
      const value = pendingScrollTarget;
      pendingScrollTarget = -1;
      if (disposed || value < 0)
        return;
      const element = getScrollEl();
      if (!element)
        return;
      element.scrollTo(horizontal ? { left: value, behavior: 'instant' } : { top: value, behavior: 'instant' });
      scrollOffset = element[scrollProp]; // re-read: the browser clamp is authoritative
      programmaticOffset = scrollOffset;
      updateRange();
    });
  }

  function flushSizeChanges(adjust: number): void {
    if (adjust !== 0)
      requestScrollWrite(scrollOffset + adjust);
    if (pendingChanged) {
      pendingChanged = false;
      version.value++;
      updateRange();
    }
    else if (viewportChanged) {
      // a pure viewport change moves no offsets — skip the `list` re-render
      updateRange();
    }
    viewportChanged = false;
  }

  // ─── Source sync ───────────────────────────────────────────────────────────

  function rebuild(): void {
    const element = getScrollEl();
    const oldCount = count;

    // Viewport stability across the rebuild: pin to the end (followOutput) or
    // anchor to the first visible item's key (jump-free prepend). Skipped when
    // the viewport is still above the list (scrollOffset < scrollMargin).
    let anchorKey: PropertyKey | undefined;
    let anchorShift = 0;
    let pinToEnd = false;
    if (element && count > 0 && !anchorSuppressed) {
      const oldTotal = contentSize();
      if (followOutput && scrollOffset >= oldTotal + scrollMargin - viewport - 1) {
        pinToEnd = true;
      }
      else if (anchorScroll && scrollOffset >= scrollMargin) {
        const first = Math.min(
          tree.lowerBound(scrollOffset - scrollMargin - paddingStart, gap),
          count - 1,
        );
        anchorKey = keys[first];
        anchorShift = scrollOffset - (offsetOf(first) + scrollMargin);
      }
    }

    items = toValue(source);
    count = items.length;
    sizes = new Float64Array(count);
    // push keeps numeric keys PACKED_SMI; prefilling with undefined
    // (Array.from({ length })) would pin the array to PACKED_ELEMENTS
    keys = [];
    keyToIndex = new Map();
    for (let i = 0; i < count; i++) {
      const key = getItemKey(items[i]!, i);
      keys.push(key);
      keyToIndex.set(key, i);
      sizes[i] = measured.get(key) ?? estimate(items[i]!, i);
    }
    // drop cache/registry entries for keys that left the list
    for (const key of measured.keys()) {
      if (!keyToIndex.has(key))
        measured.delete(key);
    }
    for (const [key, node] of elements) {
      if (!keyToIndex.has(key)) {
        observer?.unobserve(node);
        elements.delete(key);
      }
    }
    tree = new FenwickTree(count);
    tree.build(sizes);

    if (pinToEnd && count > oldCount) {
      requestScrollWrite(Math.max(0, contentSize() + scrollMargin - viewport));
    }
    else if (anchorKey !== undefined) {
      const index = keyToIndex.get(anchorKey);
      if (index !== undefined) {
        const target = offsetOf(index) + scrollMargin + anchorShift;
        if (Math.abs(target - scrollOffset) > SIZE_EPSILON)
          requestScrollWrite(target);
      }
    }

    version.value++;
    updateRange();
    maybeInitialScroll();
  }

  function maybeInitialScroll(): void {
    if (didInitialScroll || count === 0 || !getScrollEl())
      return;
    didInitialScroll = true;
    scrollTo(initialScrollIndex!, { align: 'start' });
  }

  watch(() => toValue(source), (next) => {
    // scrollTo may have re-synced this replacement already
    if (next !== items)
      rebuild();
  }, { immediate: true });

  // ─── Scroll events ─────────────────────────────────────────────────────────

  // debounce callbacks are hoisted — inline arrows would allocate per scroll event
  function onSmoothIdle(): void {
    anchorSuppressed = false;
  }

  function onScrollIdle(): void {
    isScrolling.value = false;
  }

  /** Re-arm on every scroll event: "idle" = no events for 200ms. */
  function armSmoothIdleTimer(): void {
    clearTimeout(smoothTimer);
    smoothTimer = setTimeout(onSmoothIdle, 200);
  }

  function onScroll(event: Event): void {
    const offset = (event.currentTarget as HTMLElement)[scrollProp];
    if (offset === programmaticOffset) {
      // echo of our own compensation write — don't flash isScrolling
      programmaticOffset = -1;
      scrollOffset = offset;
      updateRange();
      return;
    }
    scrollOffset = offset;
    if (scrollToRaf && Math.abs(offset - chaseTarget) > 1) {
      // the user took over mid-chase — stop fighting their input
      cancelAnimationFrame(scrollToRaf);
      scrollToRaf = 0;
    }
    updateRange();
    if (anchorSuppressed)
      armSmoothIdleTimer();
    if (scrollingDelay > 0) {
      if (!isScrolling.value)
        isScrolling.value = true;
      clearTimeout(scrollingTimer);
      scrollingTimer = setTimeout(onScrollIdle, scrollingDelay);
    }
  }

  useEventListener(getScrollEl, 'scroll', onScroll, { passive: true });

  watch(getScrollEl, (element, _previous, onCleanup) => {
    if (!element)
      return;
    ensureObserver()?.observe(element);
    // native scroll anchoring would double-correct on top of ours —
    // applied here so every wiring path gets it, not just containerProps
    const previousAnchor = element.style.overflowAnchor;
    element.style.overflowAnchor = 'none';
    scrollOffset = element[scrollProp];
    viewport = element[clientProp];
    updateRange();
    maybeInitialScroll();
    onCleanup(() => {
      observer?.unobserve(element);
      element.style.overflowAnchor = previousAnchor;
    });
  }, { immediate: true, flush: 'post' });

  // ─── Programmatic scrolling ────────────────────────────────────────────────

  /** `'auto'` resolves with nearest-edge semantics (CSS `block: 'nearest'`). */
  function resolveAlign(index: number, align: UseVirtualListAlign): Exclude<UseVirtualListAlign, 'auto'> | null {
    if (align !== 'auto')
      return align;
    const start = offsetOf(index) + scrollMargin;
    const end = start + sizes[index]!;
    const viewStart = scrollOffset;
    const viewEnd = scrollOffset + viewport;
    if (start >= viewStart && end <= viewEnd)
      return null; // fully visible
    if (start <= viewStart && end >= viewEnd)
      return null; // taller than the viewport and already covering it
    if (start < viewStart)
      return sizes[index]! > viewport ? 'end' : 'start';
    return sizes[index]! > viewport ? 'start' : 'end';
  }

  function getOffsetForIndex(index: number, align: UseVirtualListAlign = 'auto'): number {
    if (count === 0)
      return 0;
    const i = clamp(index, 0, count - 1);
    const resolved = resolveAlign(i, align);
    if (resolved === null)
      return scrollOffset;
    const start = offsetOf(i) + scrollMargin;
    const size = sizes[i]!;
    let target: number;
    if (resolved === 'start')
      target = start;
    else if (resolved === 'center')
      target = start - (viewport - size) / 2;
    else
      target = start - viewport + size;
    return clamp(target, 0, Math.max(0, totalSize.value + scrollMargin - viewport));
  }

  function scrollToOffset(offset: number, scrollOptions: { behavior?: ScrollBehavior } = {}): void {
    const element = getScrollEl();
    if (!element)
      return;
    if (scrollToRaf) {
      // an explicit scroll request takes precedence over a pending chase
      cancelAnimationFrame(scrollToRaf);
      scrollToRaf = 0;
    }
    if (scrollOptions.behavior === 'smooth') {
      anchorSuppressed = true;
      armSmoothIdleTimer();
    }
    element.scrollTo(horizontal
      ? { left: offset, behavior: scrollOptions.behavior }
      : { top: offset, behavior: scrollOptions.behavior });
  }

  function scrollTo(index: number, scrollOptions: UseVirtualListScrollToOptions = {}): void {
    // "append then scroll to newest" replaces the source and calls this in the
    // same tick — re-sync instead of silently using the stale layout
    if (toValue(source) !== items)
      rebuild();
    const element = getScrollEl();
    if (!element || count === 0)
      return;
    if (scrollToRaf) {
      cancelAnimationFrame(scrollToRaf);
      scrollToRaf = 0;
    }
    const i = clamp(index, 0, count - 1);
    const align = resolveAlign(i, scrollOptions.align ?? 'auto');
    if (align === null)
      return;
    const behavior = scrollOptions.behavior;
    if (behavior === 'smooth') {
      anchorSuppressed = true;
      armSmoothIdleTimer();
    }
    // Jumping into unmeasured territory lands on estimates; newly revealed rows
    // are measured before the next paint, shifting the target — chase it for a
    // few frames until the position is stable.
    const attempt = (triesLeft: number): void => {
      const target = getOffsetForIndex(i, align);
      chaseTarget = target;
      element.scrollTo(horizontal ? { left: target, behavior } : { top: target, behavior });
      if (behavior === 'smooth' || triesLeft <= 0)
        return;
      scrollToRaf = requestAnimationFrame(() => {
        scrollToRaf = 0;
        if (disposed || !element.isConnected)
          return;
        if (Math.abs(getOffsetForIndex(i, align) - element[scrollProp]) > 1)
          attempt(triesLeft - 1);
      });
    };
    attempt(8);
  }

  // ─── Public helpers ────────────────────────────────────────────────────────

  function updateLayout(): void {
    rebuild();
  }

  function remeasure(index?: number): void {
    if (index === undefined) {
      measured.clear();
      rebuild();
      syncLiveElements();
    }
    else if (index >= 0 && index < count) {
      measured.delete(keys[index]!);
      const delta = commitSize(index, estimate(items[index]!, index), false);
      flushSizeChanges(anchorContribution(index, delta, 0));
      syncLiveElements(index);
    }
  }

  tryOnScopeDispose(() => {
    disposed = true;
    observer?.disconnect();
    elements.clear();
    measured.clear();
    if (scrollingTimer)
      clearTimeout(scrollingTimer);
    if (smoothTimer)
      clearTimeout(smoothTimer);
    if (scrollToRaf)
      cancelAnimationFrame(scrollToRaf);
  });

  return {
    list,
    totalSize,
    range,
    isScrolling,
    containerRef,
    containerProps,
    wrapperProps,
    measureElement,
    scrollTo,
    scrollToOffset,
    getOffsetForIndex,
    updateLayout,
    remeasure,
  };
}
