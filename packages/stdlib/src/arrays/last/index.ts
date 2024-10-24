/**
 * @name last
 * @section Arrays
 * @description Gets the last element of an array
 * 
 * @param {Value[]} arr The array to get the last element of
 * @param {Value} [defaultValue] The default value to return if the array is empty
 * @returns {Value | undefined} The last element of the array, or the default value if the array is empty
 * 
 * @example
 * last([1, 2, 3, 4, 5]); // => 5
 * 
 * @example
 * last([], 3); // => 3
 * 
 * @since 0.0.3
 */
export function last<Value>(arr: Value[], defaultValue?: Value) {
  return arr[arr.length - 1] ?? defaultValue;
}
