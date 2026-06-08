/**
 * @name remove
 * @category Arrays
 * @description Return a new array with the item at `index` removed. Returns a shallow
 * copy unchanged when the index is out of range. Never mutates.
 *
 * @param {readonly T[]} array - The source array
 * @param {number} index - Index of the item to remove
 * @returns {T[]} A new array without the removed item
 *
 * @example
 * remove(['a', 'b', 'c'], 1); // ['a', 'c']
 *
 * @since 0.0.10
 */
export function remove<T>(array: readonly T[], index: number): T[] {
  const result = array.slice();

  if (index < 0 || index >= result.length)
    return result;

  result.splice(index, 1);

  return result;
}
