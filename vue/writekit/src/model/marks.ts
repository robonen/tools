import type { Attrs } from './attrs';
import { attrsEq } from './attrs';

/**
 * An inline formatting mark applied to a run of text (bold, italic, link, ...).
 * `type` is the registry key; `attrs` holds mark-specific data (e.g. link href).
 */
export interface Mark {
  readonly type: string;
  readonly attrs?: Attrs;
}

/** A normalized set of marks: at most one per type, sorted by `type`. */
export type Marks = readonly Mark[];

/** Structural equality for two marks (type + attrs). */
export function markEq(a: Mark, b: Mark): boolean {
  return a.type === b.type && attrsEq(a.attrs, b.attrs);
}

/** Ordered structural equality for two normalized mark sets. */
export function marksEq(a: Marks, b: Marks): boolean {
  if (a === b)
    return true;

  if (a.length !== b.length)
    return false;

  return a.every((mark, i) => markEq(mark, b[i]!));
}

/**
 * Canonicalize a mark set: keep the last occurrence per `type` (so a re-applied
 * mark with new attrs wins) and sort by `type`. The deterministic order is what
 * makes {@link marksEq} an O(n) comparison and keeps the model diff-stable.
 */
export function normalizeMarks(marks: Marks): Marks {
  if (marks.length <= 1)
    return marks;

  const byType = new Map<string, Mark>();

  for (const mark of marks)
    byType.set(mark.type, mark);

  return [...byType.values()].sort((a, b) => (a.type < b.type ? -1 : a.type > b.type ? 1 : 0));
}

/** Whether `marks` contains a mark structurally equal to `mark`. */
export function hasMark(marks: Marks, mark: Mark): boolean {
  return marks.some(m => markEq(m, mark));
}

/** Whether `marks` contains any mark of the given `type`. */
export function hasMarkType(marks: Marks, type: string): boolean {
  return marks.some(m => m.type === type);
}
