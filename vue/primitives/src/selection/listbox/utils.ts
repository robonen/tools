export type ListboxValue = string | number | boolean | Record<string, unknown>;

// `compare`/`includes` are shared with the combobox primitive — see ../utils/compare-values.
// Re-exported here so listbox/index.ts can surface them as compareListboxValues/includesListboxValue.
export { compare, includes } from '../../internal/utils/compare-values';

/**
 * Structural deep equality for option values. Used as a fallback when no `by`
 * comparator/key is supplied and the values are non-primitive objects, so two
 * structurally-equal object values are recognised as the same selection
 * without forcing consumers to pass `by`. Kept local (no external dependency)
 * and intentionally small — option values are shallow plain objects/arrays.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;

  const aArray = Array.isArray(a);
  const bArray = Array.isArray(b);
  if (aArray !== bArray) return false;

  if (aArray && bArray) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const aKeys = Object.keys(a as Record<string, unknown>);
  const bKeys = Object.keys(b as Record<string, unknown>);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false;
  }
  return true;
}

/**
 * Like {@link compare} from `../utils/compare-values`, but when `by` is omitted
 * and the values are objects it falls back to structural deep equality instead
 * of reference equality. Strings/numbers/booleans keep `===` semantics.
 */
export function compareDeep<T>(
  a: T | undefined,
  b: T | undefined,
  by?: string | ((x: T, y: T) => boolean),
): boolean {
  if (a === undefined || b === undefined) return false;
  if (typeof by === 'function') return by(a, b);
  if (typeof by === 'string') return (a as Record<string, unknown>)?.[by] === (b as Record<string, unknown>)?.[by];
  if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
    return deepEqual(a, b);
  }
  return a === b;
}

/** Whether `current` is contained in `value`, using {@link compareDeep}. */
export function includesDeep<T>(
  value: T | T[] | undefined,
  current: T,
  by?: string | ((x: T, y: T) => boolean),
): boolean {
  if (value === undefined) return false;
  if (!Array.isArray(value)) return compareDeep(value, current, by);
  for (const v of value) {
    if (compareDeep(v, current, by)) return true;
  }
  return false;
}

/**
 * Returns the contiguous slice of `array` between the first occurrences of
 * `start` and `end` (inclusive), regardless of their order. Empty if either is
 * missing. Powers Shift+Arrow/Home/End contiguous range selection.
 */
export function findValuesBetween<T>(
  array: T[],
  start: T,
  end: T,
  by?: string | ((x: T, y: T) => boolean),
): T[] {
  const startIndex = array.findIndex(i => compareDeep(i, start, by));
  const endIndex = array.findIndex(i => compareDeep(i, end, by));
  if (startIndex === -1 || endIndex === -1) return [];
  const min = Math.min(startIndex, endIndex);
  const max = Math.max(startIndex, endIndex);
  return array.slice(min, max + 1);
}

/**
 * Rotates `array` so it starts at `startIndex`, wrapping around.
 * `wrapArray(['a','b','c','d'], 2) === ['c','d','a','b']`.
 */
export function wrapArray<T>(array: T[], startIndex: number): T[] {
  const len = array.length;
  const out: T[] = Array.from({ length: len });
  for (let i = 0; i < len; i++) out[i] = array[(startIndex + i) % len]!;
  return out;
}

/**
 * Core type-ahead matcher. Given the list of item text values, the accumulated
 * `search` buffer, and the current match, returns the next item text to focus
 * (or `undefined`). Repeated single characters cycle through matches; longer
 * buffers match by prefix without excluding the current item.
 */
export function getNextMatch(
  values: string[],
  search: string,
  currentMatch?: string,
): string | undefined {
  const isRepeated = search.length > 1 && Array.from(search).every(c => c === search[0]);
  const normalizedSearch = isRepeated ? search[0]! : search;
  const currentMatchIndex = currentMatch ? values.indexOf(currentMatch) : -1;
  let wrapped = wrapArray(values, Math.max(currentMatchIndex, 0));
  const excludeCurrentMatch = normalizedSearch.length === 1;
  if (excludeCurrentMatch) wrapped = wrapped.filter(v => v !== currentMatch);
  const lower = normalizedSearch.toLowerCase();
  const nextMatch = wrapped.find(v => v.toLowerCase().startsWith(lower));
  return nextMatch !== currentMatch ? nextMatch : undefined;
}
