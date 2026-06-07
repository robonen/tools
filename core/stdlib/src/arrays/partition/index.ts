/**
 * @name partition
 * @category Arrays
 * @description Splits an array into two: elements that satisfy the predicate and those that do not
 *
 * @param {Value[]} array - The array to split
 * @param {(item: Value, index: number) => boolean} predicate - Decides which partition an element belongs to
 * @returns {[Value[], Value[]]} A tuple of `[matching, rest]`
 *
 * @example
 * partition([1, 2, 3, 4], n => n % 2 === 0) // => [[2, 4], [1, 3]]
 *
 * @example
 * const [strings, others] = partition(mixed, (v): v is string => typeof v === 'string');
 *
 * @since 0.0.10
 */
export function partition<Value, Matched extends Value>(
  array: Value[],
  predicate: (item: Value, index: number) => item is Matched,
): [Matched[], Array<Exclude<Value, Matched>>];
export function partition<Value>(
  array: Value[],
  predicate: (item: Value, index: number) => boolean,
): [Value[], Value[]];
export function partition<Value>(
  array: Value[],
  predicate: (item: Value, index: number) => boolean,
): [Value[], Value[]] {
  const matched: Value[] = [];
  const rest: Value[] = [];

  for (let i = 0; i < array.length; i++) {
    const item = array[i]!;

    if (predicate(item, i))
      matched.push(item);
    else
      rest.push(item);
  }

  return [matched, rest];
}
