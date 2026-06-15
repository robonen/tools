import type { Mark, Marks } from './marks';
import { marksEq, normalizeMarks } from './marks';

/**
 * A run of text sharing the same marks. The chosen inline representation
 * ("marked runs") renders to per-block contenteditable as a span list and maps
 * isomorphically onto a character-sequence CRDT with formatting.
 */
export interface InlineNode {
  readonly text: string;
  readonly marks: Marks;
}

/** A block's inline content: an ordered, normalized list of runs. */
export type Inline = readonly InlineNode[];

/** Total length of inline content in UTF-16 code units (DOM-offset compatible). */
export function inlineLength(inline: Inline): number {
  let length = 0;

  for (const run of inline)
    length += run.text.length;

  return length;
}

/** Concatenated plain text of inline content. */
export function inlineText(inline: Inline): string {
  let text = '';

  for (const run of inline)
    text += run.text;

  return text;
}

/**
 * One UTF-16 code unit carrying its marks. Operations explode inline content to
 * chars, splice, then regroup — obviously correct and cheap for small blocks.
 * UTF-16 units (not code points) keep offsets aligned with the DOM.
 */
interface Char {
  readonly ch: string;
  readonly marks: Marks;
}

function toChars(inline: Inline): Char[] {
  const chars: Char[] = [];

  for (const run of inline) {
    const marks = normalizeMarks(run.marks);

    for (let i = 0; i < run.text.length; i++)
      chars.push({ ch: run.text[i]!, marks });
  }

  return chars;
}

function fromChars(chars: readonly Char[]): Inline {
  const runs: InlineNode[] = [];

  for (const { ch, marks } of chars) {
    const last = runs[runs.length - 1];

    if (last && marksEq(last.marks, marks))
      runs[runs.length - 1] = { text: last.text + ch, marks: last.marks };
    else
      runs.push({ text: ch, marks });
  }

  return runs;
}

/**
 * Canonical form: drop empty runs, merge adjacent runs with equal mark sets,
 * normalize each run's marks. Must be applied after every inline mutation so the
 * model stays diff-stable and equality stays cheap.
 */
export function normalizeInline(inline: Inline): Inline {
  return fromChars(toChars(inline));
}

/** Inline slice between two character offsets `[from, to)`. */
export function sliceInline(inline: Inline, from: number, to: number): Inline {
  return fromChars(toChars(inline).slice(from, to));
}

/** Insert `text` (carrying `marks`) at character `offset`. */
export function insertTextInline(inline: Inline, offset: number, text: string, marks: Marks): Inline {
  if (text.length === 0)
    return normalizeInline(inline);

  const chars = toChars(inline);
  const normalized = normalizeMarks(marks);
  const inserted: Char[] = [];

  for (let i = 0; i < text.length; i++)
    inserted.push({ ch: text[i]!, marks: normalized });

  chars.splice(offset, 0, ...inserted);
  return fromChars(chars);
}

/** Insert inline `content` (preserving its marks) at character `offset`. */
export function insertInline(inline: Inline, offset: number, content: Inline): Inline {
  const chars = toChars(inline);
  chars.splice(offset, 0, ...toChars(content));
  return fromChars(chars);
}

/** Replace the character range `[from, to)` with inline `content`. */
export function replaceInline(inline: Inline, from: number, to: number, content: Inline): Inline {
  const chars = toChars(inline);
  chars.splice(from, to - from, ...toChars(content));
  return fromChars(chars);
}

/** Delete the character range `[from, to)`. */
export function deleteTextInline(inline: Inline, from: number, to: number): Inline {
  const chars = toChars(inline);
  chars.splice(from, to - from);
  return fromChars(chars);
}

/** Add `mark` across `[from, to)`, replacing any existing mark of the same type. */
export function addMarkInline(inline: Inline, from: number, to: number, mark: Mark): Inline {
  const chars = toChars(inline);

  for (let i = from; i < to && i < chars.length; i++) {
    const current = chars[i]!;
    chars[i] = { ch: current.ch, marks: normalizeMarks([...current.marks.filter(m => m.type !== mark.type), mark]) };
  }

  return fromChars(chars);
}

/** Remove every mark of `markType` across `[from, to)`. */
export function removeMarkInline(inline: Inline, from: number, to: number, markType: string): Inline {
  const chars = toChars(inline);

  for (let i = from; i < to && i < chars.length; i++) {
    const current = chars[i]!;
    chars[i] = { ch: current.ch, marks: current.marks.filter(m => m.type !== markType) };
  }

  return fromChars(chars);
}

/**
 * Marks active at a collapsed caret `offset` — used to seed stored marks and to
 * decide toggle state. Defaults to the marks of the character before the caret.
 */
export function marksAt(inline: Inline, offset: number): Marks {
  const chars = toChars(inline);

  if (chars.length === 0)
    return [];

  const index = offset > 0 ? offset - 1 : 0;
  return chars[Math.min(index, chars.length - 1)]?.marks ?? [];
}

/** Whether the whole range `[from, to)` carries a mark of `markType`. */
export function rangeHasMarkType(inline: Inline, from: number, to: number, markType: string): boolean {
  const chars = toChars(inline);

  if (from >= to)
    return false;

  for (let i = from; i < to && i < chars.length; i++) {
    if (!chars[i]!.marks.some(m => m.type === markType))
      return false;
  }

  return true;
}
