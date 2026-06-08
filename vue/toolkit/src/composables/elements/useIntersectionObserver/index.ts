import { computed, readonly, ref, toValue, watch } from 'vue';
import type { MaybeRefOrGetter, Ref } from 'vue';
import { noop, toArray } from '@robonen/stdlib';
import type { ConfigurableWindow } from '@/types';
import { defaultWindow } from '@/types';
import type { MaybeComputedElementRef, MaybeElement } from '@/composables/component/unrefElement';
import { unrefElement } from '@/composables/component/unrefElement';
import { useSupported } from '@/composables/utilities/useSupported';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

export interface UseIntersectionObserverOptions extends ConfigurableWindow {
  /**
   * The element or document used as the viewport for checking visibility
   */
  root?: MaybeComputedElementRef | Document;

  /**
   * Margin around the root. Reactive — pass a ref or getter to update it.
   *
   * @default '0px'
   */
  rootMargin?: MaybeRefOrGetter<string>;

  /**
   * Threshold(s) at which to trigger the callback. Reactive — pass a ref or
   * getter to update it.
   *
   * @default 0
   */
  threshold?: MaybeRefOrGetter<number | number[]>;

  /**
   * Start observing immediately
   *
   * @default true
   */
  immediate?: boolean;
}

export interface UseIntersectionObserverReturn {
  isSupported: Readonly<Ref<boolean>>;
  isActive: Readonly<Ref<boolean>>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

/**
 * @name useIntersectionObserver
 * @category Elements
 * @description Detect when an element enters or leaves the viewport via
 * `IntersectionObserver`. Accepts a single target, an array of targets, or a
 * ref/getter resolving to either, plus reactive `rootMargin` and `threshold`.
 *
 * @param {MaybeComputedElementRef | MaybeComputedElementRef[] | MaybeRefOrGetter<MaybeElement[]>} target Element(s) to observe
 * @param {IntersectionObserverCallback} callback Invoked with the observer entries
 * @param {UseIntersectionObserverOptions} [options={}] Options
 * @returns {UseIntersectionObserverReturn} Observer controls
 *
 * @example
 * useIntersectionObserver(el, ([{ isIntersecting }]) => {
 *   visible.value = isIntersecting;
 * });
 *
 * @since 0.0.15
 */
export function useIntersectionObserver(
  target: MaybeComputedElementRef | MaybeComputedElementRef[] | MaybeRefOrGetter<MaybeElement[]>,
  callback: IntersectionObserverCallback,
  options: UseIntersectionObserverOptions = {},
): UseIntersectionObserverReturn {
  const {
    root,
    rootMargin = '0px',
    threshold = 0,
    window = defaultWindow,
    immediate = true,
  } = options;

  const isSupported = useSupported(() => window && 'IntersectionObserver' in window);

  const targets = computed(() => {
    const value = toValue(target) as MaybeElement | MaybeElement[];
    return toArray(value as MaybeElement)
      .map(el => unrefElement(el))
      .filter((el): el is Element => Boolean(el));
  });

  const isActive = ref(immediate);

  let cleanup = noop;

  const stopWatch = isSupported.value
    ? watch(
        () => [
          targets.value,
          unrefElement(root as MaybeComputedElementRef),
          toValue(rootMargin),
          toValue(threshold),
          isActive.value,
        ] as const,
        ([els, rootEl, margin, thresh, active]) => {
          cleanup();

          if (!active || !els.length)
            return;

          const observer = new IntersectionObserver(callback, {
            root: (rootEl as Element | null) ?? (root as Document | undefined),
            rootMargin: margin,
            threshold: thresh,
          });

          for (const el of els)
            observer.observe(el);

          cleanup = () => {
            observer.disconnect();
            cleanup = noop;
          };
        },
        { immediate: true, flush: 'post' },
      )
    : noop;

  const resume = (): void => {
    isActive.value = true;
  };

  const pause = (): void => {
    cleanup();
    isActive.value = false;
  };

  const stop = (): void => {
    cleanup();
    stopWatch();
    isActive.value = false;
  };

  tryOnScopeDispose(stop);

  return {
    isSupported,
    isActive: readonly(isActive),
    pause,
    resume,
    stop,
  };
}
