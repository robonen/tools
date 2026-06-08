/**
 * @name insert
 * @category Arrays
 * @description Return a new array with `items` inserted at `index`. The index is
 * clamped into `[0, length]`, so a too-large index appends. Never mutates.
 *
 * @param {readonly T[]} array - The source array
 * @param {number} index - Position to insert at
 * @param {...T} items - Items to insert
 * @returns {T[]} A new array with the items inserted
 *
 * @example
 * insert(['a', 'c'], 1, 'b'); // ['a', 'b', 'c']
 * insert(['a'], 99, 'b', 'c'); // ['a', 'b', 'c']
 *
 * @since 0.0.10
 */
export function insert<T>(array: readonly T[], index: number, ...items: T[]): T[] {
  const result = array.slice();
  const target = Math.max(0, Math.min(index, result.length));
  result.splice(target, 0, ...items);

  return result;
}
