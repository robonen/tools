import { toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';

/**
 * @name get
 * @category Utilities
 * @description Shorthand accessor that unwraps a ref/getter to its value, optionally
 * reading a single property off the resolved value. Accepts plain values, refs and
 * getter functions (via `toValue`), so it works anywhere `unref`/`toValue` would.
 * Purely synchronous and side-effect free, so it is fully SSR-safe.
 *
 * @param {MaybeRefOrGetter<T>} source The ref, getter or plain value to read
 * @param {K} [key] Optional property key to read from the resolved value
 * @returns {T | T[K]} The unwrapped value, or `value[key]` when a key is provided
 *
 * @example
 * const count = ref(1);
 * get(count); // 1
 *
 * @example
 * const user = ref({ name: 'Ada' });
 * get(user, 'name'); // 'Ada'
 *
 * @example
 * // Works with getters and plain values too
 * get(() => 42); // 42
 * get(42); // 42
 *
 * @since 0.0.15
 */
export function get<T>(source: MaybeRefOrGetter<T>): T;
export function get<T, K extends keyof T>(source: MaybeRefOrGetter<T>, key: K): T[K];
export function get<T, K extends keyof T>(
  source: MaybeRefOrGetter<T>,
  key?: K,
): T | T[K] {
  const value = toValue(source);

  if (key === undefined || key === null)
    return value;

  return value[key];
}
