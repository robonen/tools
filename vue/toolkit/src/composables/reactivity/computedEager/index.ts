import { shallowReadonly, shallowRef, watchEffect } from 'vue';
import type { ShallowRef, WatchOptionsBase } from 'vue';

export type ComputedEagerOptions = Pick<WatchOptionsBase, 'flush' | 'onTrack' | 'onTrigger'>;

export type ComputedEagerReturn<T>
  = Readonly<ShallowRef<T>>;

/**
 * @name computedEager
 * @category Reactivity
 * @description Eager (non-lazy) computed value backed by a `watchEffect`-driven
 * `shallowRef`. Unlike `computed`, the getter runs immediately and on every
 * dependency change rather than lazily on read, so the cached value is always
 * up to date. Best for cheap derived values that are read in many places.
 *
 * @param {() => T} getter The effect function deriving the value
 * @param {ComputedEagerOptions} [options={}] Watch options (`flush` defaults to `'sync'`)
 * @returns {Readonly<ShallowRef<T>>} A readonly shallow ref holding the derived value
 *
 * @example
 * const count = ref(0);
 * const isEven = computedEager(() => count.value % 2 === 0);
 * isEven.value; // true
 *
 * @example
 * // Defer recomputation until after the component update flush
 * const total = computedEager(() => a.value + b.value, { flush: 'post' });
 *
 * @since 0.0.15
 */
export function computedEager<T>(getter: () => T, options: ComputedEagerOptions = {}): ComputedEagerReturn<T> {
  const result = shallowRef<T>();

  watchEffect(() => {
    result.value = getter();
  }, {
    ...options,
    flush: options.flush ?? 'sync',
  });

  return shallowReadonly(result) as ComputedEagerReturn<T>;
}

/**
 * @name eagerComputed
 * @category Reactivity
 * @description Alias for {@link computedEager}.
 *
 * @since 0.0.15
 */
export const eagerComputed = computedEager;
