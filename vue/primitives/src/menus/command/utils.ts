export type CommandFilterFunction = (
  value: string,
  search: string,
  keywords?: string[],
) => number;

export const COMMAND_ITEM_ATTR = 'data-primitives-command-item';
export const COMMAND_VALUE_ATTR = 'data-value';

/**
 * Default scoring filter.
 *
 * - Empty search → score 1 (item visible).
 * - Case-insensitive substring match across `value` + `keywords` → 1.
 * - In-order subsequence (loose fuzzy) match → 0.5.
 * - Otherwise → 0 (hide).
 */
export const defaultFilter: CommandFilterFunction = (value, search, keywords) => {
  if (!search) return 1;

  const needle = search.toLowerCase();
  const haystackParts = keywords && keywords.length > 0 ? [value, ...keywords] : [value];
  const haystack = haystackParts.join(' ').toLowerCase();

  if (haystack.includes(needle)) return 1;

  let i = 0;
  for (let h = 0; h < haystack.length && i < needle.length; h++) {
    if (haystack[h] === needle[i]) i++;
  }
  if (i === needle.length) return 0.5;

  return 0;
};
