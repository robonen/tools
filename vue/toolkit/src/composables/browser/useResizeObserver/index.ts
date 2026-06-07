import { computed, readonly, ref, watch } from 'vue';
import type { Ref } from 'vue';
import { toArray } from '@robonen/stdlib';
import type { ConfigurableWindow } from '@/types';
import { defaultWindow } from '@/types';
import type { MaybeComputedElementRef } from '@/composables/component/unrefElement';
import { unrefElement } from '@/composables/component/unrefElement';
import { useSupported } from '@/composables/browser/useSupported';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

export interface UseResizeObserverOptions extends ConfigurableWindow {
  /**
   * The box model to observe
   *
   * @default 'content-box'
   */
  box?: ResizeObserverBoxOptions;

  /**
   * Start observing immediately once the target is resolved
   *
   * @default true
   */
  immediate?: boolean;
}

export type ResizeObserverCallback = (
  entries: readonly ResizeObserverEntry[],
  observer: ResizeObserver,
) => void;

export interface UseResizeObserverReturn {
  /**
   * Whether `ResizeObserver` is supported in the current environment
   */
  isSupported: Readonly<Ref<boolean>>;

  /**
   * Whether the observer is currently active
   */
  isActive: Readonly<Ref<boolean>>;

  /**
   * Temporarily stop observing (disconnects the observer) while keeping the
   * target watcher alive, so observing can be resumed later
   */
  pause: () => void;

  /**
   * Resume observing after a `pause`
   */
  resume: () => void;

  /**
   * Permanently stop observing and tear down the target watcher
   */
  stop: () => void;
}

/**
 * @name useResizeObserver
 * @category Browser
 * @description Reports changes to the dimensions of an element via `ResizeObserver`.
 * Accepts a single target or an array of (reactive) targets. The observer is
 * recreated only when the resolved elements change, and can be paused/resumed.
 *
 * @param {MaybeComputedElementRef | MaybeComputedElementRef[]} target Element(s) to observe
 * @param {ResizeObserverCallback} callback Invoked with the observer entries
 * @param {UseResizeObserverOptions} [options={}] Options
 * @returns {UseResizeObserverReturn} `isSupported`, `isActive`, `pause`, `resume`, and `stop`
 *
 * @example
 * useResizeObserver(el, ([entry]) => {
 *   console.log(entry.contentRect.width);
 * });
 *
 * @example
 * const { pause, resume } = useResizeObserver([el1, el2], (entries) => {
 *   // react to multiple targets
 * }, { box: 'border-box' });
 *
 * @since 0.0.15
 */
export function useResizeObserver(
  target: MaybeComputedElementRef | MaybeComputedElementRef[],
  callback: ResizeObserverCallback,
  options: UseResizeObserverOptions = {},
): UseResizeObserverReturn {
  const { window = defaultWindow, box, immediate = true } = options;

  const isSupported = useSupported(() => window && 'ResizeObserver' in window);

  // Cache the observer options object so it is not rebuilt on every observe call
  const observerOptions: ResizeObserverOptions | undefined = box ? { box } : undefined;

  const isActive = ref(immediate);

  let observer: ResizeObserver | undefined;

  const targets = computed(() => {
    return toArray(target).map(el => unrefElement(el)).filter((el): el is Element => Boolean(el));
  });

  const cleanup = () => {
    if (observer) {
      observer.disconnect();
      observer = undefined;
    }
  };

  const stopWatch = watch(
    () => [targets.value, isActive.value] as const,
    ([els, active]) => {
      cleanup();

      if (!active || !isSupported.value || !window || !els.length)
        return;

      observer = new ResizeObserver(callback);
      for (const el of els)
        observer.observe(el, observerOptions);
    },
    { immediate: true, flush: 'post' },
  );

  const resume = () => {
    isActive.value = true;
  };

  const pause = () => {
    cleanup();
    isActive.value = false;
  };

  const stop = () => {
    cleanup();
    stopWatch();
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
