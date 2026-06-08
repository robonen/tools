import { shallowRef } from 'vue';
import type { ShallowRef } from 'vue';
import type { MaybeComputedElementRef } from '@/composables/component/unrefElement';
import { useIntersectionObserver } from '@/composables/elements/useIntersectionObserver';
import type { UseIntersectionObserverOptions, UseIntersectionObserverReturn } from '@/composables/elements/useIntersectionObserver';

export interface UseElementVisibilityOptions<Controls extends boolean = false> extends UseIntersectionObserverOptions {
  /**
   * The initial visibility state, used before the observer reports its first entry.
   *
   * @default false
   */
  initialValue?: boolean;

  /**
   * Stop observing as soon as the element becomes visible for the first time.
   *
   * @default false
   */
  once?: boolean;

  /**
   * Expose the underlying observer controls (`pause`, `resume`, `stop`, ...)
   * alongside the visibility ref instead of returning the ref directly.
   *
   * @default false
   */
  controls?: Controls;
}

export interface UseElementVisibilityReturnWithControls extends UseIntersectionObserverReturn {
  /**
   * Whether the element is currently visible within the root/viewport.
   */
  isVisible: ShallowRef<boolean>;
}

export type UseElementVisibilityReturn<Controls extends boolean = false>
  = Controls extends true
    ? UseElementVisibilityReturnWithControls
    : ShallowRef<boolean>;

/**
 * @name useElementVisibility
 * @category Elements
 * @description Track whether an element is visible within the viewport (or a
 * custom scroll root), backed by `IntersectionObserver`.
 *
 * @param {MaybeComputedElementRef} target Element to track
 * @param {UseElementVisibilityOptions} [options={}] Options
 * @returns {UseElementVisibilityReturn} Visibility ref, or `{ isVisible, ...controls }` when `controls` is `true`
 *
 * @example
 * const isVisible = useElementVisibility(el);
 *
 * @example
 * const { isVisible, stop } = useElementVisibility(el, { controls: true, once: true });
 *
 * @since 0.0.15
 */
export function useElementVisibility(
  target: MaybeComputedElementRef,
  options?: UseElementVisibilityOptions<false>,
): UseElementVisibilityReturn<false>;
export function useElementVisibility(
  target: MaybeComputedElementRef,
  options: UseElementVisibilityOptions<true>,
): UseElementVisibilityReturn<true>;
export function useElementVisibility(
  target: MaybeComputedElementRef,
  options: UseElementVisibilityOptions<boolean> = {},
): UseElementVisibilityReturn<boolean> {
  const {
    initialValue = false,
    once = false,
    controls = false,
    ...observerOptions
  } = options;

  const isVisible = shallowRef(initialValue);

  const observer = useIntersectionObserver(target, (entries) => {
    // Use the most recent entry to reflect the latest state.
    let latest = isVisible.value;
    let latestTime = 0;

    for (const entry of entries) {
      if (entry.time >= latestTime) {
        latestTime = entry.time;
        latest = entry.isIntersecting;
      }
    }

    isVisible.value = latest;

    if (once && latest)
      observer.stop();
  }, observerOptions);

  if (controls) {
    return {
      ...observer,
      isVisible,
    };
  }

  return isVisible;
}
