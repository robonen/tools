/**
 * @name first
 * @category Arrays
 * @description Returns the first element of an array
 *
 * @param {Value[]} arr The array to get the first element from
 * @param {Value} [defaultValue] The default value to return if the array is empty
 * @returns {Value | undefined} The first element of the array, or the default value if the array is empty
 *
 * @example
 * first([1, 2, 3]); // => 1
 *
 * @example
 * first([]); // => undefined
 *
 * @since 0.0.3
 */
export function first<Value>(arr: Value[], defaultValue?: Value) {
  // Branch on length, not nullishness, so a present null/undefined first element is preserved.
  return arr.length > 0 ? arr[0]! : defaultValue;
}
