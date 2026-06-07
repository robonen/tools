import { watch } from 'vue';
import type {
  MaybeRefOrGetter,
  WatchCallback,
  WatchHandle,
  WatchOptions,
  WatchSource,
} from 'vue';
import { createFilterWrapper, debounceFilter } from '@/utils/filters';
import type { ConfigurableEventFilter, EventFilter } from '@/utils/filters';

type MultiWatchSources = Array<WatchSource<unknown> | object>;

type MapSources<T> = {
  [K in keyof T]: T[K] extends WatchSource<infer V> ? V : T[K] extends object ? T[K] : never;
};

type MapOldSources<T, Immediate> = {
  [K in keyof T]: T[K] extends WatchSource<infer V>
    ? Immediate extends true ? V | undefined : V
    : T[K] extends object
      ? Immediate extends true ? T[K] | undefined : T[K]
      : never;
};

export interface WatchDebouncedOptions<Immediate> extends WatchOptions<Immediate>, ConfigurableEventFilter {
  /**
   * Delay in milliseconds before the watch callback fires after the last
   * source change. Resets on every change. Can be reactive.
   *
   * @default 0
   */
  debounce?: MaybeRefOrGetter<number>;

  /**
   * The maximum time the callback is allowed to be delayed before it is
   * forcibly invoked, even while the source keeps changing. Guarantees the
   * callback runs at least once per `maxWait` window under sustained input.
   * When omitted there is no upper bound. Can be reactive.
   *
   * @default undefined
   */
  maxWait?: MaybeRefOrGetter<number>;
}

/**
 * @name watchDebounced
 * @category Reactivity
 * @description Debounced `watch`. The callback is postponed until `debounce`
 * milliseconds have elapsed since the last source change; an optional `maxWait`
 * caps how long it can be delayed under sustained changes. Implemented via an
 * event filter so the public surface matches `watch` exactly.
 *
 * @param {WatchSource<T> | T} source The reactive source (ref, getter, reactive object, or array of sources) to watch
 * @param {WatchCallback} cb Invoked with the new value, old value, and `onCleanup` once the debounce settles
 * @param {WatchDebouncedOptions} [options] Watch options plus `debounce` (ms) and `maxWait` (ms ceiling)
 * @returns {WatchHandle} A handle to stop watching (also cancels a pending invocation)
 *
 * @example
 * const search = ref('');
 * watchDebounced(search, value => fetchResults(value), { debounce: 300 });
 *
 * @example
 * // Guarantee the callback runs at least every 1000ms while typing continuously
 * watchDebounced(input, save, { debounce: 300, maxWait: 1000 });
 *
 * @since 0.0.15
 */
export function watchDebounced<T, Immediate extends Readonly<boolean> = false>(
  source: WatchSource<T>,
  cb: WatchCallback<T, Immediate extends true ? T | undefined : T>,
  options?: WatchDebouncedOptions<Immediate>,
): WatchHandle;

export function watchDebounced<T extends Readonly<MultiWatchSources>, Immediate extends Readonly<boolean> = false>(
  sources: [...T],
  cb: WatchCallback<MapSources<T>, MapOldSources<T, Immediate>>,
  options?: WatchDebouncedOptions<Immediate>,
): WatchHandle;

export function watchDebounced<T extends object, Immediate extends Readonly<boolean> = false>(
  source: T,
  cb: WatchCallback<T, Immediate extends true ? T | undefined : T>,
  options?: WatchDebouncedOptions<Immediate>,
): WatchHandle;

export function watchDebounced<Immediate extends Readonly<boolean> = false>(
  source: WatchSource<unknown> | MultiWatchSources | object,
  cb: WatchCallback,
  options: WatchDebouncedOptions<Immediate> = {},
): WatchHandle {
  const {
    debounce = 0,
    maxWait,
    eventFilter,
    ...watchOptions
  } = options;

  // Honour a caller-supplied eventFilter if present; otherwise build a
  // debounce filter (with optional maxWait) from the timing options.
  const filter: EventFilter = eventFilter
    ?? debounceFilter(debounce, { maxWait });

  return watch(
    source,
    createFilterWrapper(filter, cb),
    watchOptions as WatchOptions<Immediate>,
  );
}

export const debouncedWatch = watchDebounced;
