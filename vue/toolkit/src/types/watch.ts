import type { WatchSource } from 'vue';

/**
 * Map a tuple of watch sources to the tuple of their resolved values, as passed
 * to a `WatchCallback`'s `value` argument. Mirrors Vue's own (non-exported)
 * `MapSources`: a `WatchSource<V>` resolves to `V`, while a plain reactive
 * object is passed through unchanged.
 *
 * Shared by the array-source overloads of the `watch*` composables.
 */
export type MapSources<T> = {
  [K in keyof T]: T[K] extends WatchSource<infer V> ? V : T[K] extends object ? T[K] : never;
};

/**
 * Like {@link MapSources} but for the `oldValue` argument: when `Immediate` is
 * `true` each entry is additionally `| undefined` (no previous value on the
 * first, immediate run).
 */
export type MapOldSources<T, Immediate> = {
  [K in keyof T]: T[K] extends WatchSource<infer V>
    ? Immediate extends true ? V | undefined : V
    : T[K] extends object
      ? Immediate extends true ? T[K] | undefined : T[K]
      : never;
};
