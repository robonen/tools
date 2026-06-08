import { computed, nextTick, reactive, shallowRef, toValue, watch } from 'vue';
import type { ComputedRef, MaybeRefOrGetter, UnwrapNestedRefs } from 'vue';
import { noop } from '@robonen/stdlib';
import { unrefElement } from '@/composables/component/unrefElement';
import { useSupported } from '@/composables/utilities/useSupported';
import { useElementVisibility } from '@/composables/elements/useElementVisibility';
import { useScroll } from '@/composables/sensors/useScroll';
import type { UseScrollOptions, UseScrollReturn } from '@/composables/sensors/useScroll';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';
import { defaultWindow } from '@/types';

export type InfiniteScrollElement = HTMLElement | SVGElement | Window | Document | null | undefined;

export type UseInfiniteScrollDirection = 'top' | 'bottom' | 'left' | 'right';

/**
 * Result of the `onLoadMore` callback. May be synchronous or a promise; the
 * loader is considered busy until it settles.
 */
export type UseInfiniteScrollLoadMore
  = (state: UnwrapNestedRefs<UseScrollReturn>) => void | Promise<unknown>;

export interface UseInfiniteScrollOptions<T extends InfiniteScrollElement = InfiniteScrollElement>
  extends UseScrollOptions {
  /**
   * Distance (px) from the edge in `direction` at which `onLoadMore` fires.
   *
   * @default 0
   */
  distance?: number;

  /**
   * Edge that triggers loading more content.
   *
   * @default 'bottom'
   */
  direction?: UseInfiniteScrollDirection;

  /**
   * Minimum delay (ms) between two `onLoadMore` calls. The loader stays busy
   * for at least this long even if the callback resolves sooner, which avoids
   * hammering when the content does not grow.
   *
   * @default 100
   */
  interval?: number;

  /**
   * Guard checked before each load. Return `false` to stop further loading
   * (e.g. when the last page has been reached).
   *
   * @default () => true
   */
  canLoadMore?: (el: T) => boolean;
}

export interface UseInfiniteScrollReturn {
  /**
   * Whether `onLoadMore` is currently in flight.
   */
  isLoading: ComputedRef<boolean>;

  /**
   * Re-run the edge check on the next tick. Call after appending content if
   * the container is still not full and you want to keep loading.
   */
  reset: () => void;
}

const DEFAULT_INTERVAL_MILLISECONDS = 100;

/**
 * @name useInfiniteScroll
 * @category Sensors
 * @description Trigger a loader as a scroll container nears one of its edges.
 * Backed by {@link useScroll} for RTL-aware arrived-edge detection: the
 * `distance` is folded into that direction's offset, so `onLoadMore` fires the
 * moment the edge comes within `distance` pixels. Re-checks automatically after
 * each load (so an under-filled container keeps loading) and degrades safely
 * under SSR and when `IntersectionObserver` is unavailable.
 *
 * @param {MaybeRefOrGetter<T>} target Scroll container (element ref, getter, window, or document)
 * @param {UseInfiniteScrollLoadMore} onLoadMore Called near the edge; may return a promise
 * @param {UseInfiniteScrollOptions<T>} [options={}] Options
 * @returns {UseInfiniteScrollReturn} `{ isLoading, reset }`
 *
 * @example
 * const { isLoading } = useInfiniteScroll(el, async () => {
 *   items.push(...await fetchNextPage());
 * }, { distance: 10 });
 *
 * @since 0.0.15
 */
export function useInfiniteScroll<T extends InfiniteScrollElement = InfiniteScrollElement>(
  target: MaybeRefOrGetter<T>,
  onLoadMore: UseInfiniteScrollLoadMore,
  options: UseInfiniteScrollOptions<T> = {},
): UseInfiniteScrollReturn {
  const {
    distance = 0,
    direction = 'bottom',
    interval = DEFAULT_INTERVAL_MILLISECONDS,
    canLoadMore = () => true,
    window = defaultWindow,
    onError = noop,
  } = options;

  // Fold `distance` into the scroll offset for the chosen edge so arrived-state
  // flips early, instead of recomputing geometry here on every tick.
  const state = reactive(useScroll(target, {
    ...options,
    offset: {
      [direction]: distance,
      ...options.offset,
    },
  }));

  // Resolve to a measurable DOM element. Window/Document are not observable by
  // IntersectionObserver and have no scroll/client metrics, so visibility is
  // skipped for them (they are always "visible").
  const observedElement = computed<HTMLElement | SVGElement | null>(() => {
    const el = unrefElement(target as MaybeRefOrGetter<HTMLElement | SVGElement | null | undefined>);
    return el ?? null;
  });

  // IntersectionObserver-backed visibility gate. When unsupported (SSR/jsdom)
  // we default to visible so the loader still works — VueUse would silently
  // never load in those environments.
  const isVisibilitySupported = useSupported(() => !!window && 'IntersectionObserver' in window);
  const isVisible = useElementVisibility(observedElement, {
    window,
    initialValue: !isVisibilitySupported.value,
  });

  const promise = shallowRef<Promise<unknown> | null>(null);
  const isLoading = computed<boolean>(() => promise.value !== null);

  const canLoad = computed<boolean>(() => {
    const el = toValue(target);

    if (!el)
      return false;

    return canLoadMore(el as T);
  });

  const isElementVisible = (): boolean => !isVisibilitySupported.value || isVisible.value;

  // Content-size signature captured before the most recent load. Used to break
  // runaway loops: if a load adds nothing along the scroll axis we do NOT
  // auto-rechain (VueUse spins forever in that case); a real scroll, edge,
  // visibility, or canLoadMore change — or an explicit reset() — still re-arms.
  let lastContentSize = -1;

  const contentSize = (el: HTMLElement | SVGElement | null): number => {
    if (!el)
      return -1;

    const node = el as Partial<HTMLElement>;
    return direction === 'top' || direction === 'bottom'
      ? (node.scrollHeight ?? 0)
      : (node.scrollWidth ?? 0);
  };

  // `auto` distinguishes the watcher-driven path (which may auto-rechain after a
  // load) from the post-load tail call (which must not rechain on stagnant content).
  const checkAndLoad = (rechained = false): void => {
    state.measure();

    if (promise.value !== null || !canLoad.value || !isElementVisible())
      return;

    // A container smaller than its content along the scroll axis can never emit
    // a scroll event, so treat "not overflowing" as already arrived.
    const el = observedElement.value;
    const isNarrower = isNotOverflowing(el, direction);

    if (!state.arrivedState[direction] && !isNarrower)
      return;

    const sizeBefore = contentSize(el);

    // The post-load re-check only proceeds while content keeps growing; once it
    // stalls we stop so a no-op loader cannot busy-loop.
    if (rechained && sizeBefore === lastContentSize)
      return;

    lastContentSize = sizeBefore;

    promise.value = Promise.all([
      // Wrap so a throwing or rejecting loader cannot leave `isLoading` stuck
      // on `true`; the error is reported and the loop continues.
      Promise.resolve()
        .then(() => onLoadMore(state))
        .catch((error) => { onError(error); }),
      delay(interval, window as (Window & typeof globalThis) | undefined),
    ]).finally(() => {
      promise.value = null;
      // Content may still not fill the container — re-check next tick.
      void nextTick(() => checkAndLoad(true));
    });
  };

  const stop = watch(
    () => [state.arrivedState[direction], isVisible.value, canLoad.value] as const,
    () => checkAndLoad(),
    { immediate: true, flush: 'post' },
  );

  tryOnScopeDispose(stop);

  return {
    isLoading,
    reset(): void {
      void nextTick(() => checkAndLoad());
    },
  };
}

function isNotOverflowing(
  el: HTMLElement | SVGElement | null,
  direction: UseInfiniteScrollDirection,
): boolean {
  if (!el)
    return false;

  // SVGElement does not expose scroll/client metrics; only HTMLElement does.
  const node = el as Partial<HTMLElement>;

  if (direction === 'top' || direction === 'bottom')
    return (node.scrollHeight ?? 0) <= (node.clientHeight ?? 0);

  return (node.scrollWidth ?? 0) <= (node.clientWidth ?? 0);
}

function delay(ms: number, window: typeof defaultWindow): Promise<void> {
  if (ms <= 0 || !window)
    return Promise.resolve();

  return new Promise<void>(resolve => window.setTimeout(resolve, ms));
}
