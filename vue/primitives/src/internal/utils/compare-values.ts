/**
 * Value-equality helpers shared by the listbox/combobox-style selection
 * primitives, which compare option values either by reference, by a property
 * key, or with a custom comparator.
 */

/**
 * Compare two (possibly undefined) values. `by` selects the comparison: omitted
 * → strict `===`; a function → custom comparator; a string → compare that
 * property key. Either value being `undefined` is never a match.
 */
export function compare<T>(
  a: T | undefined,
  b: T | undefined,
  by?: string | ((a: T, b: T) => boolean),
): boolean {
  if (a === undefined || b === undefined) return false;
  if (by === undefined) return a === b;
  if (typeof by === 'function') return by(a as T, b as T);
  // string key lookup
  return (a as Record<string, unknown>)?.[by] === (b as Record<string, unknown>)?.[by];
}

/**
 * Whether `current` is contained in `value` (a single value or an array),
 * using {@link compare} for each element.
 */
export function includes<T>(
  value: T | T[] | undefined,
  current: T,
  by?: string | ((a: T, b: T) => boolean),
): boolean {
  if (value === undefined) return false;
  if (!Array.isArray(value)) return compare(value, current, by);
  // manual loop avoids the per-call closure allocation of .some()
  for (const v of value) {
    if (compare(v, current, by)) return true;
  }
  return false;
}
