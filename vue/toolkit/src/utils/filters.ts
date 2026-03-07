import { ref, toValue } from 'vue';
import type { MaybeRefOrGetter, Ref } from 'vue';

export type EventFilter = (invoke: () => void) => void;

export interface ConfigurableEventFilter {
  /**
   * Event filter for controlling how frequently writes propagate
   *
   * @example debounceFilter(500) — debounce writes by 500ms
   * @example throttleFilter(1000) — throttle writes to once per 1000ms
   */
  eventFilter?: EventFilter;
}

/**
 * A no-op filter that invokes the callback immediately
 */
export const bypassFilter: EventFilter = (invoke) => {
  invoke();
};

/**
 * Create a debounce event filter
 *
 * @param ms Delay in milliseconds (can be reactive)
 * @returns EventFilter
 */
export function debounceFilter(ms: MaybeRefOrGetter<number>): EventFilter {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const filter: EventFilter = (invoke) => {
    if (timer !== undefined)
      clearTimeout(timer);

    timer = setTimeout(() => {
      timer = undefined;
      invoke();
    }, toValue(ms));
  };

  return filter;
}

/**
 * Create a throttle event filter
 *
 * @param ms Interval in milliseconds (can be reactive)
 * @param trailing Whether to invoke on trailing edge (default: true)
 * @param leading Whether to invoke on leading edge (default: true)
 * @returns EventFilter
 */
export function throttleFilter(
  ms: MaybeRefOrGetter<number>,
  trailing = true,
  leading = true,
): EventFilter {
  let lastExec = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastInvoke: (() => void) | undefined;
  let isLeading = true;

  const clear = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  const filter: EventFilter = (invoke) => {
    const duration = toValue(ms);
    const elapsed = Date.now() - lastExec;

    lastInvoke = invoke;

    if (elapsed >= duration && (leading || !isLeading)) {
      lastExec = Date.now();
      isLeading = false;
      invoke();
      clear();
      return;
    }

    isLeading = false;

    if (trailing) {
      clear();
      timer = setTimeout(() => {
        lastExec = Date.now();
        isLeading = true;
        timer = undefined;
        lastInvoke?.();
      }, Math.max(0, duration - elapsed));
    }
  };

  return filter;
}

export interface PausableEventFilterReturn {
  filter: EventFilter;
  isActive: Ref<boolean>;
  pause: () => void;
  resume: () => void;
}

/**
 * Create a pausable event filter
 *
 * When paused, invocations are queued and replayed on resume.
 *
 * @returns PausableEventFilterReturn
 */
export function pausableFilter(): PausableEventFilterReturn {
  const isActive = ref(true);
  let pendingInvocations: Array<() => void> = [];

  const filter: EventFilter = (invoke) => {
    if (isActive.value) {
      invoke();
    }
    else {
      pendingInvocations.push(invoke);
    }
  };

  return {
    filter,
    isActive: isActive as Ref<boolean>,
    pause: () => { isActive.value = false; },
    resume: () => {
      isActive.value = true;
      const pending = pendingInvocations;
      pendingInvocations = [];
      for (const fn of pending) fn();
    },
  };
}
