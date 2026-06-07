import { watch } from 'vue';
import type { WatchCallback, WatchHandle, WatchOptions, WatchSource } from 'vue';

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

export type WatchOnceOptions<Immediate = boolean> = Omit<WatchOptions<Immediate>, 'once'>;

/**
 * @name watchOnce
 * @category Reactivity
 * @description Shorthand for `watch` that automatically stops after the callback fires once.
 *
 * @param {WatchSource<T> | T} source The reactive source (ref, getter, reactive object, or array of sources) to watch
 * @param {WatchCallback} cb Invoked once with the new value, old value, and `onCleanup`
 * @param {WatchOnceOptions} [options] Watch options (`immediate`, `deep`, `flush`); `once` is forced on
 * @returns {WatchHandle} A handle to stop watching before the first trigger
 *
 * @example
 * const count = ref(0);
 * watchOnce(count, value => console.log('fired once with', value));
 *
 * @example
 * watchOnce([a, b], ([a, b]) => console.log(a, b));
 *
 * @since 0.0.15
 */
export function watchOnce<T>(
  source: WatchSource<T>,
  cb: WatchCallback<T, T | undefined>,
  options?: WatchOnceOptions<true>,
): WatchHandle;

export function watchOnce<T extends Readonly<MultiWatchSources>>(
  source: [...T],
  cb: WatchCallback<MapSources<T>, MapOldSources<T, true>>,
  options?: WatchOnceOptions<true>,
): WatchHandle;

export function watchOnce<T extends object>(
  source: T,
  cb: WatchCallback<T, T | undefined>,
  options?: WatchOnceOptions<true>,
): WatchHandle;

export function watchOnce(
  source: WatchSource<unknown> | MultiWatchSources | object,
  cb: WatchCallback,
  options?: WatchOnceOptions,
): WatchHandle {
  // Vue's native `once` stops the watcher after its first trigger (the
  // immediate run counts as that trigger), so no manual teardown is needed.
  return watch(source, cb, { ...options, once: true });
}
