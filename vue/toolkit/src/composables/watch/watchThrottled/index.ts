import { watch } from 'vue';
import type { MaybeRefOrGetter, WatchCallback, WatchHandle, WatchOptions, WatchSource } from 'vue';
import { createFilterWrapper, throttleFilter } from '@/utils/filters';
import type { EventFilter } from '@/utils/filters';

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

export interface WatchThrottledOptions<Immediate> extends WatchOptions<Immediate> {
  /**
   * Throttle interval in milliseconds (can be reactive)
   *
   * @default 0
   */
  throttle?: MaybeRefOrGetter<number>;
  /**
   * Invoke the callback on the trailing edge of the interval
   *
   * @default true
   */
  trailing?: boolean;
  /**
   * Invoke the callback on the leading edge of the interval
   *
   * @default true
   */
  leading?: boolean;
}

/**
 * @name watchThrottled
 * @category Watch
 * @description Like `watch`, but throttles the callback so it fires at most once per interval.
 *
 * @param {WatchSource<T> | T} source The reactive source (ref, getter, reactive object, or array of sources) to watch
 * @param {WatchCallback} cb Invoked with the new value, old value, and `onCleanup`, throttled by the interval
 * @param {WatchThrottledOptions} [options] Watch options plus `throttle` (ms), `leading`, and `trailing`
 * @returns {WatchHandle} A handle to stop watching
 *
 * @example
 * const count = ref(0);
 * watchThrottled(count, value => console.log(value), { throttle: 500 });
 *
 * @example
 * watchThrottled([a, b], ([a, b]) => save(a, b), { throttle: 1000, leading: false });
 *
 * @since 0.0.15
 */
export function watchThrottled<T, Immediate extends Readonly<boolean> = false>(
  source: WatchSource<T>,
  cb: WatchCallback<T, Immediate extends true ? T | undefined : T>,
  options?: WatchThrottledOptions<Immediate>,
): WatchHandle;

export function watchThrottled<T extends Readonly<MultiWatchSources>, Immediate extends Readonly<boolean> = false>(
  source: [...T],
  cb: WatchCallback<MapSources<T>, MapOldSources<T, Immediate>>,
  options?: WatchThrottledOptions<Immediate>,
): WatchHandle;

export function watchThrottled<T extends object, Immediate extends Readonly<boolean> = false>(
  source: T,
  cb: WatchCallback<T, Immediate extends true ? T | undefined : T>,
  options?: WatchThrottledOptions<Immediate>,
): WatchHandle;

export function watchThrottled(
  source: WatchSource<unknown> | MultiWatchSources | object,
  cb: WatchCallback,
  options: WatchThrottledOptions<boolean> = {},
): WatchHandle {
  const {
    throttle = 0,
    trailing = true,
    leading = true,
    eventFilter = throttleFilter(throttle, trailing, leading),
    ...watchOptions
  } = options as WatchThrottledOptions<boolean> & { eventFilter?: EventFilter };

  return watch(
    source,
    createFilterWrapper(eventFilter, cb),
    watchOptions,
  );
}
