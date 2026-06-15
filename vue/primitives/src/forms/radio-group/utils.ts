import { isEqual } from '@robonen/stdlib';

/**
 * Any value a radio item can carry — not just strings. Mirrors the
 * select/listbox value model so a radio group can hold numbers, booleans, or
 * plain objects (compared structurally or via `by`).
 */
export type AcceptableValue = string | number | boolean | Record<string, unknown> | null;

/**
 * Strategy for comparing a radio item's `value` against the group's selected
 * value. Omitted → structural deep equality (`@robonen/stdlib` `isEqual`), so
 * object/array values toggle correctly; a function → custom comparator; a
 * string → compare that property key.
 */
export type RadioCompareBy = string | ((a: AcceptableValue, b: AcceptableValue) => boolean);

/**
 * Compare two radio values. `undefined` on the selected side never matches, so
 * an unselected group reports every item as unchecked.
 */
export function compareValues(
  selected: AcceptableValue | undefined,
  candidate: AcceptableValue,
  by?: RadioCompareBy,
): boolean {
  if (selected === undefined) return false;
  if (typeof by === 'function') return by(selected, candidate);
  if (typeof by === 'string') {
    return (selected as Record<string, unknown> | null)?.[by]
      === (candidate as Record<string, unknown> | null)?.[by];
  }
  return isEqual(selected, candidate);
}
