import type { Arrayable } from '../../types';

/**
 * @name toArray
 * @category Arrays
 * @description Normalize an `Arrayable<T>` value into an array. `undefined` and `null` become an empty array; a single value is wrapped; arrays are returned as-is (no copy).
 *
 * @param {Arrayable<Value> | null | undefined} value The value to normalize
 * @returns {Value[]} The value as an array
 *
 * @example
 * toArray(1) // => [1]
 *
 * @example
 * toArray([1, 2]) // => [1, 2]
 *
 * @example
 * toArray(undefined) // => []
 *
 * @since 0.0.10
 */
export function toArray<Value>(value: Arrayable<Value> | null | undefined): Value[] {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}
