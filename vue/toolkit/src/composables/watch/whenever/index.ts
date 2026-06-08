import { nextTick, watch } from 'vue';
import type { WatchCallback, WatchHandle, WatchOptions, WatchSource } from 'vue';

type Truthy<T> = T extends false | null | undefined | 0 | '' ? never : T;

export interface WheneverOptions<Immediate = boolean> extends WatchOptions<Immediate> {
  /**
   * Only trigger the callback once when the source becomes truthy.
   *
   * Overrides the `once` option inherited from `WatchOptions`.
   *
   * @default false
   */
  once?: boolean;
}

/**
 * @name whenever
 * @category Watch
 * @description Shorthand for watching a source to be truthy. Behaves like `watch`, but the callback only fires when the resolved value is truthy.
 *
 * @param {WatchSource<T>} source The reactive source to watch
 * @param {WatchCallback} cb Invoked with the truthy value, previous value, and `onCleanup`
 * @param {WheneverOptions} [options] Watch options (`immediate`, `deep`, `flush`, `once`)
 * @returns {WatchHandle} A handle to stop watching
 *
 * @example
 * const ready = ref(false);
 * whenever(ready, () => console.log('ready!'));
 *
 * @example
 * whenever(() => count.value > 5, () => console.log('over five'), { once: true });
 *
 * @since 0.0.15
 */
export function whenever<T>(source: WatchSource<T>, cb: WatchCallback<Truthy<T>, T | undefined>, options?: WheneverOptions<true>): WatchHandle;
export function whenever<T>(source: WatchSource<T>, cb: WatchCallback<Truthy<T>, T>, options?: WheneverOptions<false>): WatchHandle;
export function whenever<T>(
  source: WatchSource<T>,
  cb: WatchCallback<Truthy<T>, T | undefined>,
  options?: WheneverOptions,
): WatchHandle {
  const stop = watch(
    source,
    (value, oldValue, onCleanup) => {
      if (value) {
        if (options?.once)
          nextTick(() => stop());

        cb(value as Truthy<T>, oldValue, onCleanup);
      }
    },
    {
      ...options,
      once: false,
    } as WatchOptions,
  );

  return stop;
}
