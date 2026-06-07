import type { Position } from './position';
import { positionEq } from './position';
import type { EditorDocument } from './document';
import { blockIndex } from './document';

/** A text selection: caret when `anchor === focus`, range otherwise. May span blocks. */
export interface TextSelection {
  readonly kind: 'text';
  readonly anchor: Position;
  readonly focus: Position;
}

/** A block-level selection of one or more whole blocks (atoms, Mod+A stage 2). */
export interface NodeSelection {
  readonly kind: 'node';
  readonly ids: readonly string[];
}

export type Selection = TextSelection | NodeSelection;

/** Construct a text selection (focus defaults to anchor → collapsed caret). */
export function textSelection(anchor: Position, focus: Position = anchor): TextSelection {
  return { kind: 'text', anchor, focus };
}

/** Construct a collapsed caret selection. */
export function caret(blockId: string, offset: number): TextSelection {
  const point: Position = { blockId, offset };
  return { kind: 'text', anchor: point, focus: point };
}

/** Construct a block-level selection. */
export function nodeSelection(ids: readonly string[]): NodeSelection {
  return { kind: 'node', ids };
}

export function isTextSelection(sel: Selection): sel is TextSelection {
  return sel.kind === 'text';
}

export function isNodeSelection(sel: Selection): sel is NodeSelection {
  return sel.kind === 'node';
}

/** Whether the selection is a collapsed caret. */
export function isCollapsed(sel: Selection): boolean {
  return sel.kind === 'text' && positionEq(sel.anchor, sel.focus);
}

/** Whether the selection spans more than one block. */
export function isAcrossBlocks(sel: Selection): boolean {
  return sel.kind === 'text' && sel.anchor.blockId !== sel.focus.blockId;
}

/**
 * Endpoints of a text selection in document order (`from` before `to`). Within
 * one block they are ordered by offset; across blocks by block index.
 */
export function orderedSelection(sel: TextSelection, doc: EditorDocument): { from: Position; to: Position } {
  const { anchor, focus } = sel;

  if (anchor.blockId === focus.blockId)
    return anchor.offset <= focus.offset ? { from: anchor, to: focus } : { from: focus, to: anchor };

  return blockIndex(doc, anchor.blockId) <= blockIndex(doc, focus.blockId)
    ? { from: anchor, to: focus }
    : { from: focus, to: anchor };
}

/** Structural equality for two selections. */
export function selectionEq(a: Selection, b: Selection): boolean {
  if (a.kind !== b.kind)
    return false;

  if (a.kind === 'text' && b.kind === 'text')
    return positionEq(a.anchor, b.anchor) && positionEq(a.focus, b.focus);

  if (a.kind === 'node' && b.kind === 'node')
    return a.ids.length === b.ids.length && a.ids.every((id, i) => id === b.ids[i]);

  return false;
}
