import { watch } from 'vue';
import type { WatchCallback, WatchOptions, WatchSource, WatchStopHandle } from 'vue';
import { noop } from '@robonen/stdlib';
import type { AnyFunction } from '@robonen/stdlib';
import { bypassFilter, createFilterWrapper } from '@/utils';
import type { ConfigurableEventFilter } from '@/utils';

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

export interface WatchWithFilterOptions<Immediate> extends WatchOptions<Immediate>, ConfigurableEventFilter {}

export type IgnoredUpdater = (updater: () => void) => void;
export type IgnoredPrevAsyncUpdates = () => void;

export interface WatchIgnorableReturn {
  /**
   * Run `updater`, suppressing the watch callback for any source writes it performs
   */
  ignoreUpdates: IgnoredUpdater;
  /**
   * Ignore the callback for source changes already queued before this call (async flush only)
   */
  ignorePrevAsyncUpdates: IgnoredPrevAsyncUpdates;
  /**
   * Stop the underlying watcher(s)
   */
  stop: WatchStopHandle;
}

/**
 * @name watchIgnorable
 * @category Reactivity
 * @description Extended `watch` that exposes `ignoreUpdates(fn)` and `ignorePrevAsyncUpdates()` to suppress reactions to programmatic writes.
 *
 * @param {WatchSource<T> | T} source The reactive source (ref, getter, reactive object, or array of sources) to watch
 * @param {WatchCallback} cb Invoked with the new value, old value, and `onCleanup` when the source changes (unless ignored)
 * @param {WatchWithFilterOptions} [options={}] Watch options (`immediate`, `deep`, `flush`) plus an optional `eventFilter`
 * @returns {WatchIgnorableReturn} `{ ignoreUpdates, ignorePrevAsyncUpdates, stop }`
 *
 * @example
 * const count = ref(0);
 * const { ignoreUpdates } = watchIgnorable(count, value => console.log('changed', value));
 *
 * count.value = 1;            // logs: changed 1
 * ignoreUpdates(() => {
 *   count.value = 2;          // does NOT log
 * });
 * count.value = 3;            // logs: changed 3
 *
 * @since 0.0.15
 */
export function watchIgnorable<T, Immediate extends Readonly<boolean> = false>(
  source: WatchSource<T>,
  cb: WatchCallback<T, Immediate extends true ? T | undefined : T>,
  options?: WatchWithFilterOptions<Immediate>,
): WatchIgnorableReturn;

export function watchIgnorable<T extends Readonly<MultiWatchSources>, Immediate extends Readonly<boolean> = false>(
  sources: [...T],
  cb: WatchCallback<MapSources<T>, MapOldSources<T, Immediate>>,
  options?: WatchWithFilterOptions<Immediate>,
): WatchIgnorableReturn;

export function watchIgnorable<T extends object, Immediate extends Readonly<boolean> = false>(
  source: T,
  cb: WatchCallback<T, Immediate extends true ? T | undefined : T>,
  options?: WatchWithFilterOptions<Immediate>,
): WatchIgnorableReturn;

export function watchIgnorable<Immediate extends Readonly<boolean> = false>(
  source: any,
  cb: AnyFunction,
  options: WatchWithFilterOptions<Immediate> = {},
): WatchIgnorableReturn {
  const { eventFilter = bypassFilter, ...watchOptions } = options;

  const filteredCb = createFilterWrapper(eventFilter, cb);

  let ignoreUpdates: IgnoredUpdater;
  let ignorePrevAsyncUpdates: IgnoredPrevAsyncUpdates;
  let stop: WatchStopHandle;

  if (watchOptions.flush === 'sync') {
    let ignore = false;

    // No async queue to drain with sync flush
    ignorePrevAsyncUpdates = noop;

    ignoreUpdates = (updater: () => void) => {
      ignore = true;
      updater();
      ignore = false;
    };

    stop = watch(
      source,
      (...args: any[]) => {
        if (!ignore)
          filteredCb(...args);
      },
      watchOptions,
    );
  }
  else {
    // flush: 'pre' | 'post'
    const disposables: WatchStopHandle[] = [];

    // `syncCounter` increments on every source change (tracked synchronously).
    // `ignoreCounter` records how many of those changes should be suppressed.
    // Comparing the two on the async callback lets us know whether the change
    // came purely from an ignored update or includes a real modification.
    let ignoreCounter = 0;
    let syncCounter = 0;

    ignorePrevAsyncUpdates = () => {
      ignoreCounter = syncCounter;
    };

    disposables.push(
      watch(
        source,
        () => {
          syncCounter++;
        },
        { ...watchOptions, flush: 'sync' },
      ),
    );

    ignoreUpdates = (updater: () => void) => {
      const syncCounterPrev = syncCounter;
      updater();
      ignoreCounter += syncCounter - syncCounterPrev;
    };

    disposables.push(
      watch(
        source,
        (...args: any[]) => {
          const ignore = ignoreCounter > 0 && ignoreCounter === syncCounter;
          ignoreCounter = 0;
          syncCounter = 0;

          if (ignore)
            return;

          filteredCb(...args);
        },
        watchOptions,
      ),
    );

    stop = () => {
      for (const dispose of disposables) dispose();
    };
  }

  return { ignoreUpdates, ignorePrevAsyncUpdates, stop };
}
