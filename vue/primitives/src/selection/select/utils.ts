/**
 * Any serialisable value a select option can carry — not just strings. Mirrors
 * the listbox/combobox value model so a select can hold numbers, booleans, or
 * plain objects (compared via `by`).
 */
export type AcceptableValue = string | number | boolean | Record<string, unknown>;

export const OPEN_KEYS = [' ', 'Enter', 'ArrowUp', 'ArrowDown'];
export const SELECTION_KEYS = [' ', 'Enter'];
export const CONTENT_MARGIN = 10;

export function getOpenState(open: boolean): 'open' | 'closed' {
  return open ? 'open' : 'closed';
}

/**
 * Compare two option values. `by` selects the strategy: omitted → strict `===`
 * for primitives / structural deep-equality for objects; a function → custom
 * comparator; a string → compare that property key. Either side `undefined`
 * never matches.
 */
export function compare<T>(
  a: T | undefined,
  b: T | undefined,
  by?: string | ((a: T, b: T) => boolean),
): boolean {
  if (a === undefined || b === undefined) return false;
  if (typeof by === 'function') return by(a, b);
  if (typeof by === 'string') return (a as Record<string, unknown>)?.[by] === (b as Record<string, unknown>)?.[by];
  if (typeof a === 'string') return a === b;
  if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
    return deepEqual(a, b);
  }
  return a === b;
}

/**
 * Whether `current` is contained in `value` (a single value or array), using
 * {@link compare} for each element.
 */
export function valueComparator<T>(
  value: T | T[] | undefined,
  current: T,
  by?: string | ((a: T, b: T) => boolean),
): boolean {
  if (value === undefined) return false;
  if (!Array.isArray(value)) return compare(value, current, by);
  for (const v of value) {
    if (compare(v, current, by)) return true;
  }
  return false;
}

/**
 * Structural deep equality fallback for object values when `by` is omitted, so
 * two structurally-equal plain objects are recognised as the same selection.
 * Kept local (no external dependency) — option values are shallow plain
 * objects/arrays.
 */
function deepEqual(a: unknown, b: unknown): boolean {
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

export function shouldShowPlaceholder(value?: AcceptableValue | AcceptableValue[]): boolean {
  return value === undefined
    || value === null
    || value === ''
    || (Array.isArray(value) && value.length === 0);
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
 * `search` buffer, and the current match text, returns the next item text to
 * focus (or `undefined`). Repeated single characters cycle through matches;
 * longer buffers match by prefix without excluding the current item.
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
