export type UniqueKey = string | number | symbol;
export type Extractor<Value, Key extends UniqueKey> = (value: Value) => Key;

/**
 * @name unique
 * @category Arrays
 * @description Returns a new array with unique values from the original array
 *
 * @param {Value[]} array - The array to filter
 * @param {Function} [extractor] - The function to extract the value to compare
 * @returns {Value[]} - The new array with unique values
 *
 * @example
 * unique([1, 2, 3, 3, 4, 5, 5, 6]) //=> [1, 2, 3, 4, 5, 6]
 *
 * @example
 * unique([{ id: 1 }, { id: 2 }, { id: 1 }], value => value.id) //=> [{ id: 1 }, { id: 2 }]
 *
 * @since 0.0.3
 */
export function unique<Value, Key extends UniqueKey>(
  array: Value[],
  extractor?: Extractor<Value, Key>,
): Value[] {
  // Fast path: a plain Set is leaner than a Map storing each value as both key and value.
  if (!extractor)
    return [...new Set(array)];

  // Last-write-wins per extracted key, preserving first-seen insertion order.
  const values = new Map<Key, Value>();

  for (const value of array)
    values.set(extractor(value), value);

  return [...values.values()];
}
