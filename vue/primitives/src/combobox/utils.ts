export type AcceptableValue = string | number | boolean | Record<string, unknown>;

export const OPEN_KEYS = ['Enter', ' ', 'ArrowDown', 'ArrowUp', 'PageUp', 'PageDown', 'Home', 'End'];
// The input is a text field: Space must type a space and Home/End/Page* must move
// the caret, so only the arrow keys open a closed list (typing opens it via input).
export const INPUT_OPEN_KEYS = ['ArrowDown', 'ArrowUp'];
export const SELECTION_KEYS = ['Enter', ' '];

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getOpenState(open: boolean): 'open' | 'closed' {
  return open ? 'open' : 'closed';
}

export function compare<T>(
  a: T | undefined,
  b: T | undefined,
  by?: string | ((a: T, b: T) => boolean),
): boolean {
  if (a === undefined || b === undefined) return false;
  if (by === undefined) return a === b;
  if (typeof by === 'function') return by(a as T, b as T);
  return (a as any)?.[by] === (b as any)?.[by];
}

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

export interface ComboboxFilterItem {
  id: string;
  textValue: string;
}

export type ComboboxFilterFunction = (
  items: ComboboxFilterItem[],
  searchTerm: string,
) => ComboboxFilterItem[];

export const defaultFilter: ComboboxFilterFunction = (items, searchTerm) => {
  const term = searchTerm.toLowerCase();
  if (!term) return items;
  const out: ComboboxFilterItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i]!;
    if (it.textValue.toLowerCase().includes(term)) out.push(it);
  }
  return out;
};
