import type { Node, Position, Selection, Slice } from '../model';
import {
  blockById,
  blockIndex,
  caret,
  createDoc,
  createNode,
  inlineLength,
  isAcrossBlocks,
  isCollapsed,
  isEmptySlice,
  isInlineSlice,
  nodeInline,
  nodeSelection,
  orderedSelection,
  sliceText,
  withFreshIds,
} from '../model';
import type { NodeSpec, Schema } from '../schema';
import { filterInlineMarks, normalizeDocument } from '../schema';
import type { Command, Transaction, WritekitState } from '../state';
import { createTransaction } from '../state';
import { defaultTextType } from './util';

/** Where content goes once the selection has been removed. */
export type InsertAnchor
  = | { readonly kind: 'text'; readonly at: Position }
    | { readonly kind: 'index'; readonly index: number };

/**
 * Remove whatever the selection covers, recording the steps on `tr`, and say
 * where an insertion should now go. A collapsed caret removes nothing and
 * anchors at itself. Returns `null` when the selection cannot be removed (a
 * range whose end blocks are not text).
 */
export function deleteSelectionInto(tr: Transaction, state: WritekitState): InsertAnchor | null {
  const sel = state.selection;

  if (sel.kind === 'node') {
    if (sel.ids.length === 0)
      return null;

    const index = Math.min(...sel.ids.map(id => blockIndex(state.doc, id)).filter(i => i !== -1));
    for (const id of sel.ids)
      tr.removeBlock(id);

    return { kind: 'index', index };
  }

  if (isCollapsed(sel))
    return { kind: 'text', at: sel.focus };

  const { from, to } = orderedSelection(sel, state.doc);

  if (!isAcrossBlocks(sel)) {
    tr.deleteText(from.blockId, from.offset, to.offset);
    return { kind: 'text', at: from };
  }

  const a = blockById(state.doc, from.blockId);
  const b = blockById(state.doc, to.blockId);

  if (!a || !b || !isTextNode(a, state.schema) || !isTextNode(b, state.schema))
    return null;

  tr.deleteText(a.id, from.offset, inlineLength(nodeInline(a)));
  tr.deleteText(b.id, 0, to.offset);

  const ai = blockIndex(state.doc, a.id);
  const bi = blockIndex(state.doc, b.id);
  for (const mid of state.doc.content.slice(ai + 1, bi))
    tr.removeBlock(mid.id);

  tr.mergeBlock(b.id, a.id);
  return { kind: 'text', at: from };
}

/** A document never ends up empty: seed a default text block if everything was removed. */
export function ensureNotEmpty(tr: Transaction, state: WritekitState): void {
  if (tr.doc.content.length > 0)
    return;

  const type = defaultTextType(state);
  const node = createNode(type, { attrs: state.schema.defaultAttrs(type) });
  tr.insertBlock(node, 0).setSelection(caret(node.id, 0));
}

/**
 * Splice a fragment into the working document at `anchor`, recording the steps
 * on `tr`, and return the selection that lands after it.
 *
 * Inline fragments insert in place. Block fragments split the caret's block:
 * an open first block merges into the head, an open last block into the tail,
 * whole blocks go between. An empty line the fragment lands in is replaced,
 * not kept, and an empty head/tail adopts the type of the block it merges with
 * — pasting a heading into a blank paragraph yields a heading.
 */
export function insertSliceAt(tr: Transaction, state: WritekitState, slice: Slice, anchor: InsertAnchor): Selection {
  const schema = state.schema;
  const blocks = prepareBlocks(slice.blocks, schema);

  if (blocks.length === 0)
    return anchor.kind === 'text' ? caret(anchor.at.blockId, anchor.at.offset) : landingAfter(tr, anchor.index);

  if (anchor.kind === 'index')
    return insertBlocksAt(tr, schema, blocks, anchor.index);

  const at = anchor.at;
  const target = blockById(tr.doc, at.blockId);
  const spec = target ? schema.nodeSpec(target.type) : undefined;

  if (!target || !spec || spec.content.kind !== 'text')
    return insertBlocksAt(tr, schema, blocks, target ? blockIndex(tr.doc, target.id) + 1 : tr.doc.content.length);

  // Code holds raw text: everything flattens to lines, marks and all.
  if (spec.code) {
    const text = sliceText(slice);
    tr.insertText(at, text, []);
    return caret(target.id, at.offset + text.length);
  }

  const first = blocks[0]!;
  const last = blocks[blocks.length - 1]!;
  const single = blocks.length === 1;

  if (single && isInlineSlice({ ...slice, blocks }) && isTextNode(first, schema)) {
    if (inlineLength(nodeInline(target)) === 0)
      adoptType(tr, target, first);

    const runs = filterInlineMarks(nodeInline(first), specOf(tr, target.id, schema)!, schema);
    tr.insertInline(at, runs);
    return caret(target.id, at.offset + inlineLength(runs));
  }

  const headEmpty = at.offset === 0;
  const tailEmpty = at.offset === inlineLength(nodeInline(target));

  tr.splitBlock(at);
  const tailId = tr.lastSplitId!;
  let index = blockIndex(tr.doc, target.id) + 1;

  const openStart = !single && slice.openStart && isTextNode(first, schema);
  const openEnd = !single && slice.openEnd && isTextNode(last, schema);

  if (openStart) {
    if (headEmpty)
      adoptType(tr, target, first);
    tr.insertInline(at, filterInlineMarks(nodeInline(first), specOf(tr, target.id, schema)!, schema));
  }
  else {
    tr.insertBlock(first, index++);

    if (headEmpty) {
      tr.removeBlock(target.id);
      index--;
    }
  }

  for (const node of blocks.slice(1, single ? undefined : -1))
    tr.insertBlock(node, index++);

  if (single)
    return closedLanding(tr, schema, first, tailId, tailEmpty);

  if (openEnd) {
    const tail = blockById(tr.doc, tailId)!;
    if (tailEmpty)
      adoptType(tr, tail, last);

    const runs = filterInlineMarks(nodeInline(last), specOf(tr, tailId, schema)!, schema);
    tr.insertInline({ blockId: tailId, offset: 0 }, runs);
    return caret(tailId, inlineLength(runs));
  }

  tr.insertBlock(last, index);
  return closedLanding(tr, schema, last, tailId, tailEmpty);
}

/** Replace the selection with a fragment — one transaction, one undo entry. */
export function replaceSelection(slice: Slice): Command {
  return (state, dispatch) => {
    if (isEmptySlice(slice))
      return false; // an empty clipboard pastes nothing — and deletes nothing

    const tr = createTransaction(state);
    const anchor = deleteSelectionInto(tr, state);

    if (!anchor)
      return false;

    tr.setSelection(insertSliceAt(tr, state, slice, anchor));
    ensureNotEmpty(tr, state);

    if (tr.steps.length === 0)
      return false;

    dispatch?.(tr);
    return true;
  };
}

// ── helpers ─────────────────────────────────────────────────────

function isTextNode(node: Node, schema: Schema): boolean {
  return schema.nodeSpec(node.type)?.content.kind === 'text';
}

function specOf(tr: Transaction, blockId: string, schema: Schema): NodeSpec | undefined {
  const block = blockById(tr.doc, blockId);
  return block ? schema.nodeSpec(block.type) : undefined;
}

/** An empty block takes the type of the block merging into it. */
function adoptType(tr: Transaction, target: Node, source: Node): void {
  if (target.type !== source.type)
    tr.setBlockType(target.id, source.type, source.attrs);
}

/** Fresh ids, then the same funnel every document passes through: unknown types dropped, attrs coerced, marks filtered. */
function prepareBlocks(blocks: readonly Node[], schema: Schema): readonly Node[] {
  return normalizeDocument(createDoc(withFreshIds(blocks)), schema).content;
}

function insertBlocksAt(tr: Transaction, schema: Schema, blocks: readonly Node[], index: number): Selection {
  let cursor = index;
  for (const node of blocks)
    tr.insertBlock(node, cursor++);

  return landingIn(blocks[blocks.length - 1]!, schema);
}

/** Where the caret settles once a whole block has been inserted before the split's tail. */
function closedLanding(tr: Transaction, schema: Schema, node: Node, tailId: string, tailEmpty: boolean): Selection {
  if (!tailEmpty)
    return caret(tailId, 0);

  tr.removeBlock(tailId);
  return landingIn(node, schema);
}

/** End of a text block, or the block itself when it has no text position. */
function landingIn(node: Node, schema: Schema): Selection {
  return isTextNode(node, schema) ? caret(node.id, inlineLength(nodeInline(node))) : nodeSelection([node.id]);
}

/** After removing blocks at `index`: the end of what precedes, else the start of what follows. */
function landingAfter(tr: Transaction, index: number): Selection {
  const before = tr.doc.content[index - 1];
  if (before)
    return caret(before.id, inlineLength(nodeInline(before)));

  const first = tr.doc.content[0];
  return first ? caret(first.id, 0) : nodeSelection([]);
}

export { landingAfter as selectionAfterRemoval };
