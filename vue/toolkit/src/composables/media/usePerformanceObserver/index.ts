import { readonly, ref, watch } from 'vue';
import type { Ref } from 'vue';
import type { ConfigurableWindow } from '@/types';
import { defaultWindow } from '@/types';
import { useSupported } from '@/composables/utilities/useSupported';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

export interface UsePerformanceObserverOptions extends PerformanceObserverInit, ConfigurableWindow {
  /**
   * Start observing immediately on creation
   *
   * @default true
   */
  immediate?: boolean;
}

export interface UsePerformanceObserverReturn {
  /**
   * Whether `PerformanceObserver` is supported in the current environment
   */
  isSupported: Readonly<Ref<boolean>>;

  /**
   * Whether the observer is currently active
   */
  isActive: Readonly<Ref<boolean>>;

  /**
   * Resume observing after a `pause`
   */
  resume: () => void;

  /**
   * Temporarily stop observing (disconnects the observer) while keeping the
   * activation watcher alive, so observing can be resumed later
   */
  pause: () => void;

  /**
   * Permanently stop observing and tear down the activation watcher
   */
  stop: () => void;

  /**
   * Synchronously return the current list of buffered performance entries and
   * clear the observer's buffer. Returns `undefined` when not observing.
   */
  takeRecords: () => PerformanceEntryList | undefined;
}

/**
 * @name usePerformanceObserver
 * @category Media
 * @description Observe performance metrics via `PerformanceObserver`. The
 * observer is (re)created only when activation changes, and can be paused,
 * resumed, or permanently stopped. SSR-safe: nothing runs until mounted in
 * a supporting environment.
 *
 * @param {PerformanceObserverCallback} callback Invoked with the observed entries and observer
 * @param {UsePerformanceObserverOptions} [options={}] Observer init (`entryTypes`/`type`/`buffered`) plus `immediate`
 * @returns {UsePerformanceObserverReturn} `isSupported`, `isActive`, `pause`, `resume`, `stop`, and `takeRecords`
 *
 * @example
 * usePerformanceObserver((list) => {
 *   console.log(list.getEntries());
 * }, { entryTypes: ['paint', 'measure'] });
 *
 * @example
 * const { pause, resume } = usePerformanceObserver(onEntries, {
 *   entryTypes: ['longtask'],
 *   buffered: true,
 * });
 *
 * @since 0.0.15
 */
export function usePerformanceObserver(
  callback: PerformanceObserverCallback,
  options: UsePerformanceObserverOptions = {},
): UsePerformanceObserverReturn {
  const { window = defaultWindow, immediate = true, ...observerOptions } = options;

  const isSupported = useSupported(() => window && 'PerformanceObserver' in window);

  const isActive = ref(immediate);

  let observer: PerformanceObserver | undefined;

  const cleanup = () => {
    if (observer) {
      observer.disconnect();
      observer = undefined;
    }
  };

  const takeRecords = () => observer?.takeRecords();

  const stopWatch = watch(
    () => [isActive.value, isSupported.value] as const,
    ([active, supported]) => {
      cleanup();

      if (!active || !supported || !window)
        return;

      observer = new PerformanceObserver(callback);
      observer.observe(observerOptions);
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
    resume,
    pause,
    stop,
    takeRecords,
  };
}
