import { computed, readonly, ref, toValue, watch } from 'vue';
import type { MaybeRefOrGetter, Ref } from 'vue';
import { toArray } from '@robonen/stdlib';
import type { ConfigurableWindow } from '@/types';
import { defaultWindow } from '@/types';
import type { MaybeComputedElementRef, MaybeElement } from '@/composables/component/unrefElement';
import { unrefElement } from '@/composables/component/unrefElement';
import { useSupported } from '@/composables/utilities/useSupported';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

export interface UseMutationObserverOptions extends MutationObserverInit, ConfigurableWindow {
  /**
   * Start observing immediately once a target is available
   *
   * @default true
   */
  immediate?: boolean;
}

export interface UseMutationObserverReturn {
  isSupported: Readonly<Ref<boolean>>;
  /**
   * Whether the observer is currently active (not paused or stopped)
   */
  isActive: Readonly<Ref<boolean>>;
  /**
   * Temporarily disconnect the observer without tearing down the watcher.
   * Re-observe with `resume`.
   */
  pause: () => void;
  /**
   * Re-attach the observer to the current target(s) after a `pause`.
   */
  resume: () => void;
  /**
   * Permanently stop observing and dispose the watcher.
   */
  stop: () => void;
  /**
   * Synchronously take and clear the observer's record queue
   */
  takeRecords: () => MutationRecord[] | undefined;
}

/**
 * @name useMutationObserver
 * @category Elements
 * @description Watch for changes to the DOM tree via `MutationObserver`.
 * Accepts a single target, an array of targets, or a getter returning either.
 *
 * @param {MaybeComputedElementRef | MaybeComputedElementRef[] | MaybeRefOrGetter<MaybeElement[]>} target Element(s) to observe
 * @param {MutationCallback} callback Invoked with the mutation records
 * @param {UseMutationObserverOptions} [options={}] Observer options (childList, attributes, …)
 * @returns {UseMutationObserverReturn} `isSupported`, `isActive`, `pause`, `resume`, `stop`, and `takeRecords`
 *
 * @example
 * useMutationObserver(el, (records) => {
 *   console.log(records);
 * }, { attributes: true });
 *
 * @example
 * const { pause, resume } = useMutationObserver([elA, elB], onMutate, { childList: true });
 *
 * @since 0.0.15
 */
export function useMutationObserver(
  target: MaybeComputedElementRef | MaybeComputedElementRef[] | MaybeRefOrGetter<MaybeElement[]>,
  callback: MutationCallback,
  options: UseMutationObserverOptions = {},
): UseMutationObserverReturn {
  const { window = defaultWindow, immediate = true, ...observerOptions } = options;

  const isSupported = useSupported(() => window && 'MutationObserver' in window);

  let observer: MutationObserver | undefined;

  const isActive = ref(immediate);

  const targets = computed(() => {
    const value = toArray(toValue(target));
    const set = new Set<Element>();

    for (const item of value) {
      const el = unrefElement(item as MaybeComputedElementRef);
      if (el)
        set.add(el);
    }

    return set;
  });

  const cleanup = () => {
    if (observer) {
      observer.disconnect();
      observer = undefined;
    }
  };

  const takeRecords = () => observer?.takeRecords();

  const stopWatch = watch(
    () => [targets.value, isActive.value] as const,
    ([els, active]) => {
      cleanup();

      if (!active || !isSupported.value || !window || !els.size)
        return;

      observer = new MutationObserver(callback);
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
    takeRecords,
  };
}
