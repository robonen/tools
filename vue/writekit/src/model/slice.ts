import type { Inline } from './inline';
import { inlineLength, inlineText, sliceInline } from './inline';
import type { Node } from './node';
import { isInlineContent, nodeInline, withContent } from './node';
import type { WritekitDocument } from './document';
import { blockById, blockIndex } from './document';
import { createId } from './id';
import type { Selection } from './selection';
import { orderedSelection } from './selection';

/**
 * A fragment of a document — what copy produces and paste consumes. The block
 * model is flat, so ProseMirror's open *depths* collapse to two flags: whether
 * the fragment's first/last block continues the text it lands in (a range cut
 * out of the middle of paragraphs) or stands on its own (whole blocks).
 */
export interface Slice {
  readonly blocks: readonly Node[];
  /** The first block's runs continue the block the caret is in — no boundary before them. */
  readonly openStart: boolean;
  /** The last block stays open: the caret lands inside it and the tail of the split block joins it. */
  readonly openEnd: boolean;
}

export function createSlice(blocks: readonly Node[], openStart = false, openEnd = false): Slice {
  return { blocks, openStart, openEnd };
}

/** A single-block, open-both-ends fragment: plain inline content with a carrier type. */
export function inlineSlice(content: Inline, type = 'paragraph'): Slice {
  return createSlice([{ id: createId(), type, attrs: {}, content }], true, true);
}

export function isEmptySlice(slice: Slice): boolean {
  return slice.blocks.length === 0;
}

/** Whether a fragment is one open text block — i.e. it inserts inline, with no block boundary. */
export function isInlineSlice(slice: Slice): boolean {
  return slice.blocks.length === 1 && slice.openStart && slice.openEnd && isInlineContent(slice.blocks[0]!.content);
}

/** Plain text of a fragment: one line per text block; atoms contribute nothing. */
export function sliceText(slice: Slice): string {
  const lines: string[] = [];

  for (const block of slice.blocks) {
    if (isInlineContent(block.content))
      lines.push(inlineText(block.content));
  }

  return lines.join('\n');
}

/**
 * Copies of `blocks` under new ids. Pasted blocks must never reuse the ids they
 * were copied with: the same id twice in a document breaks selection and, in
 * the CRDT, re-inserting a known id *reactivates* the tombstoned original
 * instead of adding a block.
 */
export function withFreshIds(blocks: readonly Node[]): Node[] {
  return blocks.map(block => ({ ...block, id: createId() }));
}

/**
 * The fragment covered by a selection, or `null` when there is nothing to copy.
 * A text range is open at both ends; a node selection is whole blocks.
 */
export function sliceFromSelection(doc: WritekitDocument, selection: Selection): Slice | null {
  if (selection.kind === 'node') {
    const blocks = selection.ids
      .map(id => blockById(doc, id))
      .filter((block): block is Node => block !== null);
    return blocks.length > 0 ? createSlice(blocks) : null;
  }

  const { from, to } = orderedSelection(selection, doc);
  const first = blockById(doc, from.blockId);
  const last = blockById(doc, to.blockId);

  if (!first || !last)
    return null;

  if (first.id === last.id) {
    if (from.offset === to.offset)
      return null;
    return createSlice([withContent(first, sliceInline(nodeInline(first), from.offset, to.offset))], true, true);
  }

  const head = withContent(first, sliceInline(nodeInline(first), from.offset, inlineLength(nodeInline(first))));
  const tail = withContent(last, sliceInline(nodeInline(last), 0, to.offset));
  const middle = doc.content.slice(blockIndex(doc, first.id) + 1, blockIndex(doc, last.id));

  return createSlice([head, ...middle, tail], true, true);
}
