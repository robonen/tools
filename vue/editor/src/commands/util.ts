import type { Attrs, Node } from '../model';
import { blockById, isCollapsed, marksAt, nodeInline, orderedSelection, rangeHasMarkType } from '../model';
import type { EditorState } from '../state';

/** Block id the selection's focus is in (or the first node-selected block). */
export function selectionBlockId(state: EditorState): string | undefined {
  const sel = state.selection;
  return sel.kind === 'text' ? sel.focus.blockId : sel.ids[0];
}

/** The block the selection currently focuses, or `null`. */
export function focusBlock(state: EditorState): Node | null {
  const id = selectionBlockId(state);
  return id ? blockById(state.doc, id) : null;
}

/** Whether a block type holds inline (text) content. */
export function isTextBlockType(state: EditorState, type: string): boolean {
  return state.schema.nodeSpec(type)?.content.kind === 'text';
}

/**
 * Whether a mark is active for the current selection — used by `toggleMark` and
 * by toolbars (call a command without `dispatch` for the same answer).
 */
export function isMarkActive(state: EditorState, type: string): boolean {
  const sel = state.selection;

  if (sel.kind !== 'text')
    return false;

  if (isCollapsed(sel)) {
    if (state.storedMarks)
      return state.storedMarks.some(mark => mark.type === type);

    const block = blockById(state.doc, sel.focus.blockId);
    return block ? marksAt(nodeInline(block), sel.focus.offset).some(mark => mark.type === type) : false;
  }

  if (sel.anchor.blockId !== sel.focus.blockId)
    return false;

  const { from, to } = orderedSelection(sel, state.doc);
  const block = blockById(state.doc, sel.focus.blockId);
  return block ? rangeHasMarkType(nodeInline(block), from.offset, to.offset, type) : false;
}

/** Whether the focused block matches a type (and optionally a subset of attrs). */
export function isBlockActive(state: EditorState, type: string, attrs?: Attrs): boolean {
  const block = focusBlock(state);

  if (!block || block.type !== type)
    return false;

  if (!attrs)
    return true;

  return Object.keys(attrs).every(key => block.attrs[key] === attrs[key]);
}
