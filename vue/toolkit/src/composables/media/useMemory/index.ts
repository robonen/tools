import { shallowRef } from 'vue';
import type { ComputedRef, ShallowRef } from 'vue';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { useSupported } from '@/composables/utilities/useSupported';
import { useIntervalFn } from '@/composables/animation/useIntervalFn';

/**
 * Non-standard `performance.memory` heap statistics.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory
 */
export interface MemoryInfo {
  /**
   * The maximum size of the heap, in bytes, that is available to the context.
   */
  readonly jsHeapSizeLimit: number;

  /**
   * The total allocated heap size, in bytes.
   */
  readonly totalJSHeapSize: number;

  /**
   * The currently active segment of JS heap, in bytes.
   */
  readonly usedJSHeapSize: number;

  [Symbol.toStringTag]: 'MemoryInfo';
}

type PerformanceWithMemory
  = Performance & {
    memory: MemoryInfo;
  };

export interface UseMemoryOptions extends ConfigurableWindow {
  /**
   * Polling interval in milliseconds.
   *
   * @default 1000
   */
  interval?: number;

  /**
   * Start polling immediately and read the first sample synchronously.
   *
   * @default true
   */
  immediate?: boolean;
}

export interface UseMemoryReturn {
  /**
   * Whether `performance.memory` is available in the current environment.
   */
  isSupported: ComputedRef<boolean>;

  /**
   * The latest `performance.memory` snapshot, or `undefined` until the first
   * sample is read (or when unsupported).
   */
  memory: ShallowRef<MemoryInfo | undefined>;
}

/**
 * @name useMemory
 * @category Media
 * @description Reactive `performance.memory` heap statistics, polled on an
 * interval. SSR-safe and a no-op where the API is unavailable.
 *
 * @param {UseMemoryOptions} [options={}] Configuration options
 * @returns {UseMemoryReturn} `{ isSupported, memory }`
 *
 * @example
 * const { isSupported, memory } = useMemory();
 * // memory.value?.usedJSHeapSize
 *
 * @example
 * // Poll every 500ms
 * const { memory } = useMemory({ interval: 500 });
 *
 * @since 0.0.15
 */
export function useMemory(options: UseMemoryOptions = {}): UseMemoryReturn {
  const {
    interval = 1000,
    immediate = true,
    window = defaultWindow,
  } = options;

  const memory = shallowRef<MemoryInfo | undefined>();

  const isSupported = useSupported(
    () => !!window && 'performance' in window && 'memory' in window.performance,
  );

  if (isSupported.value) {
    useIntervalFn(
      () => {
        memory.value = (window!.performance as PerformanceWithMemory).memory;
      },
      interval,
      {
        immediate,
        immediateCallback: immediate,
      },
    );
  }

  return {
    isSupported,
    memory,
  };
}
