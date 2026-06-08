import { ref, toValue } from 'vue';
import type { MaybeRefOrGetter, Ref } from 'vue';
import { debounce, throttle } from '@robonen/stdlib';
import type { AnyFunction } from '@robonen/stdlib';

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

export interface DebounceFilterOptions {
  /**
   * The maximum time the callback may be delayed before it is forcibly invoked
   * under sustained input (can be reactive). When omitted there is no upper bound.
   */
  maxWait?: MaybeRefOrGetter<number>;
}

/**
 * A no-op filter that invokes the callback immediately
 */
export const bypassFilter: EventFilter = (invoke) => {
  invoke();
};

/**
 * Create a debounce event filter — a reactive-aware wrapper around
 * `@robonen/stdlib`'s `debounce` (trailing edge).
 *
 * @param ms Delay in milliseconds (can be reactive)
 * @param options Optional `maxWait` ceiling (can be reactive)
 * @returns EventFilter
 */
export function debounceFilter(ms: MaybeRefOrGetter<number>, options: DebounceFilterOptions = {}): EventFilter {
  const { maxWait } = options;

  const debounced = debounce(
    (invoke: () => void) => invoke(),
    () => toValue(ms),
    { maxWait: maxWait === undefined ? undefined : () => toValue(maxWait) },
  );

  return (invoke) => {
    // Non-positive delay runs synchronously (behaves like an un-debounced call).
    if (toValue(ms) <= 0) {
      debounced.cancel();
      invoke();
      return;
    }

    debounced(invoke);
  };
}

/**
 * Create a throttle event filter — a reactive-aware wrapper around
 * `@robonen/stdlib`'s `throttle`.
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
  const throttled = throttle(
    (invoke: () => void) => invoke(),
    () => toValue(ms),
    { trailing, leading },
  );

  return invoke => throttled(invoke);
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

/**
 * Wrap a function with an {@link EventFilter}, preserving arguments, `this`,
 * and the return value through a promise.
 *
 * The wrapper returns a promise that resolves with the result of the wrapped
 * function once the filter lets it through. When the filter coalesces calls
 * (e.g. debounce/throttle), every pending promise scheduled since the last
 * invocation resolves together with that invocation's result — so nothing is
 * left dangling.
 *
 * @param filter The event filter controlling invocation timing
 * @param fn The function to wrap
 * @returns A filtered wrapper returning a promise of the result
 */
export function createFilterWrapper<T extends AnyFunction>(
  filter: EventFilter,
  fn: T,
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  // Promises scheduled but not yet resolved by an invocation. The filter may
  // drop intermediate invokes (debounce) — they all settle on the next real one.
  let pending: Array<{ resolve: (value: any) => void; reject: (reason?: unknown) => void }> = [];

  function wrapper(this: unknown, ...args: Parameters<T>) {
    return new Promise<Awaited<ReturnType<T>>>((resolve, reject) => {
      pending.push({ resolve, reject });

      filter(() => {
        const settled = pending;
        pending = [];

        try {
          const result = fn.apply(this, args);
          for (const p of settled) p.resolve(result);
        }
        catch (error) {
          for (const p of settled) p.reject(error);
        }
      });
    });
  }

  return wrapper;
}
