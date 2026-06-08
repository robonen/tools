/**
 * @name move
 * @category Arrays
 * @description Return a new array with the item at `from` moved to `to`. Out-of-range
 * `from` returns a shallow copy unchanged; `to` is clamped into range. Never mutates.
 *
 * @param {readonly T[]} array - The source array
 * @param {number} from - Index to move from
 * @param {number} to - Index to move to
 * @returns {T[]} A new array with the item moved
 *
 * @example
 * move(['a', 'b', 'c'], 0, 2); // ['b', 'c', 'a']
 *
 * @since 0.0.10
 */
export function move<T>(array: readonly T[], from: number, to: number): T[] {
  const result = array.slice();

  if (from < 0 || from >= result.length)
    return result;

  const item = result.splice(from, 1)[0] as T;
  const target = Math.max(0, Math.min(to, result.length));
  result.splice(target, 0, item);

  return result;
}
