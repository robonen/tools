/**
 * @name sum
 * @category Arrays
 * @description Returns the sum of all the elements in an array
 * 
 * @param {Value[]} array - The array to sum
 * @param {(item: Value) => number} [getValue] - A function that returns the value to sum from each element in the array
 * @returns {number} The sum of all the elements in the array
 * 
 * @example
 * sum([1, 2, 3, 4, 5]) // => 15
 * 
 * sum([{ value: 1 }, { value: 2 }, { value: 3 }], (item) => item.value) // => 6
 * 
 * @since 0.0.3
 */
export function sum<Value extends number>(array: Value[]): number;
export function sum<Value>(array: Value[], getValue: (item: Value) => number): number;
export function sum<Value>(array: Value[], getValue?: (item: Value) => number): number {
  // This check is necessary because the overload without the getValue argument
  // makes tree-shaking based on argument types possible
  if (!getValue)
    return array.reduce((acc, item) => acc + (item as number), 0);

  return array.reduce((acc, item) => acc + getValue(item), 0);
}
