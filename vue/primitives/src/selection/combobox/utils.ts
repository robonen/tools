export type AcceptableValue = string | number | boolean | Record<string, unknown>;

export const OPEN_KEYS = ['Enter', ' ', 'ArrowDown', 'ArrowUp', 'PageUp', 'PageDown', 'Home', 'End'];
// The input is a text field: Space must type a space and Home/End/Page* must move
// the caret, so only the arrow keys open a closed list (typing opens it via input).
export const INPUT_OPEN_KEYS = ['ArrowDown', 'ArrowUp'];
export const SELECTION_KEYS = ['Enter', ' '];

export function getOpenState(open: boolean): 'open' | 'closed' {
  return open ? 'open' : 'closed';
}

// `valueComparator` is listbox's `includes` under a combobox-specific name —
// shared from ../utils/compare-values to avoid duplicating the comparison logic.
export { includes as valueComparator } from '../../internal/utils/compare-values';

export interface ComboboxFilterItem {
  id: string;
  textValue: string;
}

export type ComboboxFilterFunction = (
  items: ComboboxFilterItem[],
  searchTerm: string,
) => ComboboxFilterItem[];

/**
 * Substring match that ignores case AND diacritics via Unicode canonical
 * decomposition (`café` matches `cafe`), using only native `String.normalize`
 * — no `Intl`/locale dependency, deterministic across runtimes.
 */
function foldAccents(value: string): string {
  // NFD splits accented characters into base + combining marks; \p{M} (Unicode
  // Mark) strips those marks, leaving the bare letters.
  return value.normalize('NFD').replaceAll(/\p{M}/gu, '').toLowerCase();
}

/**
 * Accent/diacritic-insensitive substring match. Reused by {@link defaultFilter}
 * and exposed so a custom `filterFunction` can opt into the same folding.
 */
export function accentInsensitiveContains(haystack: string, needle: string): boolean {
  return foldAccents(haystack).includes(foldAccents(needle));
}

export const defaultFilter: ComboboxFilterFunction = (items, searchTerm) => {
  if (!searchTerm) return items;
  const out: ComboboxFilterItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i]!;
    if (accentInsensitiveContains(it.textValue, searchTerm)) out.push(it);
  }
  return out;
};
