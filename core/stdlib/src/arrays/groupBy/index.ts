/**
 * @name groupBy
 * @category Arrays
 * @description Groups the elements of an array by the key returned by `getKey`
 *
 * @param {Value[]} array - The array to group
 * @param {(item: Value, index: number) => Key} getKey - Maps an element to its group key
 * @returns {Record<Key, Value[]>} An object of arrays, keyed by group
 *
 * @example
 * groupBy([1, 2, 3, 4], n => (n % 2 === 0 ? 'even' : 'odd'))
 * // => { odd: [1, 3], even: [2, 4] }
 *
 * @example
 * groupBy([{ type: 'a', v: 1 }, { type: 'b', v: 2 }, { type: 'a', v: 3 }], item => item.type)
 * // => { a: [{ type: 'a', v: 1 }, { type: 'a', v: 3 }], b: [{ type: 'b', v: 2 }] }
 *
 * @since 0.0.10
 */
export function groupBy<Value, Key extends PropertyKey>(
  array: Value[],
  getKey: (item: Value, index: number) => Key,
): Record<Key, Value[]> {
  // Null-prototype object so keys like '__proto__'/'constructor' become ordinary own keys
  // instead of colliding with Object.prototype (which would throw on .push or pollute).
  const result = Object.create(null) as Record<Key, Value[]>;

  for (let i = 0; i < array.length; i++) {
    const item = array[i]!;
    const key = getKey(item, i);

    (result[key] ??= []).push(item);
  }

  return result;
}
