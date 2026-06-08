/**
 * @name swap
 * @category Arrays
 * @description Return a new array with the items at indices `a` and `b` swapped.
 * Returns a shallow copy unchanged when either index is out of range or equal.
 * Never mutates.
 *
 * @param {readonly T[]} array - The source array
 * @param {number} a - First index
 * @param {number} b - Second index
 * @returns {T[]} A new array with the two items swapped
 *
 * @example
 * swap(['a', 'b', 'c'], 0, 2); // ['c', 'b', 'a']
 *
 * @since 0.0.10
 */
export function swap<T>(array: readonly T[], a: number, b: number): T[] {
  const result = array.slice();

  if (a < 0 || b < 0 || a >= result.length || b >= result.length || a === b)
    return result;

  const temp = result[a] as T;
  result[a] = result[b] as T;
  result[b] = temp;

  return result;
}
