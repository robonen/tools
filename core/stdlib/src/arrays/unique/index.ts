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
 * unique([{ id: 1 }, { id: 2 }, { id: 1 }], (a, b) => a.id === b.id) //=> [{ id: 1 }, { id: 2 }]
 * 
 * @since 0.0.3
 */
export function unique<Value, Key extends UniqueKey>(
  array: Value[],
  extractor?: Extractor<Value, Key>,
) {
  const values = new Map<Key, Value>();

  for (const value of array) {
    const key = extractor ? extractor(value) : value as any;
    values.set(key, value);
  }

  return Array.from(values.values());
}
