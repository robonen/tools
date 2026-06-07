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
