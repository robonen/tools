/**
 * Shared Tree helpers. Pure, no Vue imports.
 */

export interface FlatItem<T = unknown> {
  /** Unique string key produced by `getKey(value)`. */
  key: string;
  /** Original item value. */
  value: T;
  /** 1-based depth — top-level is 1. */
  level: number;
  /** Whether the item has a non-empty children array. */
  hasChildren: boolean;
  /** Parent key, or `undefined` for root-level items. */
  parentKey?: string;
  /** Number of siblings in the same group (for `aria-setsize`). */
  setSize: number;
  /** 1-based position within the sibling group (for `aria-posinset`). */
  posInSet: number;
}

/**
 * Depth-first flattening of a tree into a visible list, honoring `expandedKeys`.
 * Collapsed subtrees are skipped entirely. Iterative implementation to avoid
 * deep recursion on large trees.
 */
export function flattenVisible<T>(
  items: readonly T[],
  getKey: (item: T) => string,
  getChildren: (item: T) => readonly T[] | undefined | null,
  expandedKeys: ReadonlySet<string>,
): Array<FlatItem<T>> {
  const out: Array<FlatItem<T>> = [];
  // Stack holds frames to expand. Seed in reverse so first child pops first.
  interface Frame { nodes: readonly T[]; index: number; level: number; parentKey?: string }
  const stack: Frame[] = [{ nodes: items, index: 0, level: 1, parentKey: undefined }];

  while (stack.length > 0) {
    const frame = stack[stack.length - 1]!;
    if (frame.index >= frame.nodes.length) {
      stack.pop();
      continue;
    }
    const node = frame.nodes[frame.index]!;
    const posInSet = frame.index + 1;
    frame.index += 1;

    const key = getKey(node);
    const children = getChildren(node);
    const hasChildren = Array.isArray(children) && children.length > 0;
    out.push({
      key,
      value: node,
      level: frame.level,
      hasChildren,
      parentKey: frame.parentKey,
      setSize: frame.nodes.length,
      posInSet,
    });

    if (hasChildren && expandedKeys.has(key)) {
      stack.push({
        nodes: children as readonly T[],
        index: 0,
        level: frame.level + 1,
        parentKey: key,
      });
    }
  }

  return out;
}

/**
 * Flattens all descendants (regardless of expansion) — used for cascade
 * select/deselect operations.
 */
export function flattenAll<T>(
  items: readonly T[],
  getKey: (item: T) => string,
  getChildren: (item: T) => readonly T[] | undefined | null,
): Array<{ key: string; value: T }> {
  const out: Array<{ key: string; value: T }> = [];
  const stack: Array<readonly T[]> = [items];
  while (stack.length > 0) {
    const nodes = stack.pop()!;
    for (const node of nodes) {
      out.push({ key: getKey(node), value: node });
      const children = getChildren(node);
      if (Array.isArray(children) && children.length > 0) stack.push(children);
    }
  }
  return out;
}

/**
 * Collects the keys of all *direct and transitive* children of `value` (the
 * node itself is NOT included). Iterative — never recurses, so deeply nested
 * trees can't blow the call stack. Powers `propagateSelect` / `bubbleSelect`
 * and the indeterminate computation.
 */
export function collectDescendantKeys<T>(
  value: T,
  getKey: (item: T) => string,
  getChildren: (item: T) => readonly T[] | undefined | null,
): string[] {
  const out: string[] = [];
  const first = getChildren(value);
  if (!first || first.length === 0) return out;
  const stack: Array<readonly T[]> = [first];
  while (stack.length > 0) {
    const nodes = stack.pop()!;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]!;
      out.push(getKey(node));
      const ch = getChildren(node);
      if (ch && ch.length > 0) stack.push(ch);
    }
  }
  return out;
}

/**
 * Rotates `array` so it starts at `startIndex`, wrapping around.
 * `wrapArray(['a','b','c','d'], 2) === ['c','d','a','b']`.
 */
export function wrapArray<T>(array: readonly T[], startIndex: number): T[] {
  const len = array.length;
  const out: T[] = Array.from({ length: len });
  for (let i = 0; i < len; i++) out[i] = array[(startIndex + i) % len]!;
  return out;
}

/**
 * Core type-ahead matcher. Given the list of item text values, the accumulated
 * `search` buffer, and the current match, returns the next item text to focus
 * (or `undefined`). Repeated single characters cycle through matches; longer
 * buffers match by prefix without excluding the current item. Wraps around so
 * focus always moves forward from the current item.
 */
export function getNextMatch(
  values: readonly string[],
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

/**
 * Returns the contiguous slice of `keys` between the first occurrences of
 * `start` and `end` (inclusive), regardless of their order. Empty if either is
 * missing. Powers Shift+Arrow/Home/End contiguous range selection.
 */
export function keysBetween(
  keys: readonly string[],
  start: string,
  end: string,
): string[] {
  const startIndex = keys.indexOf(start);
  const endIndex = keys.indexOf(end);
  if (startIndex === -1 || endIndex === -1) return [];
  const min = Math.min(startIndex, endIndex);
  const max = Math.max(startIndex, endIndex);
  return keys.slice(min, max + 1) as string[];
}
