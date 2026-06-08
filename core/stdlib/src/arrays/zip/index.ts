/**
 * @name zip
 * @category Arrays
 * @description Combines several arrays into an array of tuples, stopping at the shortest input
 *
 * @param {...Array} arrays - The arrays to zip together
 * @returns {Array} An array of tuples; its length equals the shortest input array
 *
 * @example
 * zip([1, 2, 3], ['a', 'b', 'c']) // => [[1, 'a'], [2, 'b'], [3, 'c']]
 *
 * @example
 * zip([1, 2], ['a', 'b'], [true, false]) // => [[1, 'a', true], [2, 'b', false]]
 *
 * @example
 * zip([1, 2, 3], ['a']) // => [[1, 'a']] (truncated to the shortest)
 *
 * @since 0.0.10
 */
export function zip<A>(a: A[]): Array<[A]>;
export function zip<A, B>(a: A[], b: B[]): Array<[A, B]>;
export function zip<A, B, C>(a: A[], b: B[], c: C[]): Array<[A, B, C]>;
export function zip<A, B, C, D>(a: A[], b: B[], c: C[], d: D[]): Array<[A, B, C, D]>;
export function zip<A, B, C, D, E>(a: A[], b: B[], c: C[], d: D[], e: E[]): Array<[A, B, C, D, E]>;
export function zip(...arrays: any[][]): any[][] {
  if (arrays.length === 0)
    return [];

  let length = arrays[0]!.length;

  for (let i = 1; i < arrays.length; i++)
    length = Math.min(length, arrays[i]!.length);

  return Array.from({ length }, (_, i) => arrays.map(array => array[i]));
}
