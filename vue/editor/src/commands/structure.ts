import type { Attrs, Node } from '../model';
import {
  blockById,
  caret,
  inlineLength,
  isAcrossBlocks,
  isCollapsed,
  nextBlock,
  nodeInline,
  nodeSelection,
  orderedSelection,
  previousBlock,
} from '../model';
import type { Command, EditorState } from '../state';
import { createTransaction } from '../state';

/** Type/attrs for the block created when splitting `block` at `offset`. */
function continuation(state: EditorState, block: Node, offset: number): { type?: string; attrs?: Attrs } {
  const spec = state.schema.nodeSpec(block.type);

  // Defining blocks (e.g. code-block) keep their identity across a split.
  if (spec?.defining)
    return { type: block.type, attrs: block.attrs };

  // Pressing Enter at the end of a heading starts a fresh paragraph.
  if (block.type === 'heading' && offset >= inlineLength(nodeInline(block)) && state.registry.hasBlock('paragraph'))
    return { type: 'paragraph' };

  // A new to-do item always starts unchecked (don't inherit the checked state).
  if (block.type === 'todo-list')
    return { type: block.type, attrs: { ...block.attrs, checked: false } };

  // Otherwise continue the same type (lists keep their indent/listType attrs).
  return { type: block.type, attrs: block.attrs };
}

/**
 * Split the current text block at the caret (Enter). A non-collapsed same-block
 * selection is deleted first. Caret lands at the start of the new block.
 */
export const splitBlock: Command = (state, dispatch) => {
  const sel = state.selection;

  if (sel.kind !== 'text' || isAcrossBlocks(sel))
    return false;

  const block = blockById(state.doc, sel.focus.blockId);
  const spec = block && state.schema.nodeSpec(block.type);

  if (!block || spec?.content.kind !== 'text')
    return false;

  // Code blocks never split — Enter inserts a literal newline.
  if (spec.code) {
    if (dispatch) {
      const tr = createTransaction(state);
      let pos = sel.focus;

      if (!isCollapsed(sel)) {
        const { from, to } = orderedSelection(sel, state.doc);
        tr.deleteText(block.id, from.offset, to.offset);
        pos = from;
      }

      tr.insertText(pos, '\n', []).setSelection(caret(block.id, pos.offset + 1));
      dispatch(tr);
    }

    return true;
  }

  if (dispatch) {
    const tr = createTransaction(state);
    let pos = sel.focus;

    if (!isCollapsed(sel)) {
      const { from, to } = orderedSelection(sel, state.doc);
      tr.deleteText(block.id, from.offset, to.offset);
      pos = from;
    }

    const cont = continuation(state, block, pos.offset);
    tr.splitBlock(pos, cont.type, cont.attrs);
    tr.setSelection(caret(tr.lastSplitId!, 0));
    dispatch(tr);
  }

  return true;
};

/** Insert a hard line break (Shift+Enter) inside the current block. */
export const insertHardBreak: Command = (state, dispatch) => {
  const sel = state.selection;

  if (sel.kind !== 'text' || !isCollapsed(sel))
    return false;

  const block = blockById(state.doc, sel.focus.blockId);
  const spec = block && state.schema.nodeSpec(block.type);

  if (!block || spec?.content.kind !== 'text')
    return false;

  if (dispatch) {
    dispatch(createTransaction(state)
      .insertText(sel.focus, '\n', state.storedMarks ?? [])
      .setSelection(caret(block.id, sel.focus.offset + 1)));
  }

  return true;
};

/**
 * Backspace at the start of a block: merge it into the previous text block, or
 * select a preceding atom block (image/divider) so a second Backspace deletes it.
 */
export const joinBackward: Command = (state, dispatch) => {
  const sel = state.selection;

  if (sel.kind !== 'text' || !isCollapsed(sel) || sel.focus.offset !== 0)
    return false;

  const current = blockById(state.doc, sel.focus.blockId);
  const prev = previousBlock(state.doc, sel.focus.blockId);

  if (!current || !prev)
    return false;

  const currentSpec = state.schema.nodeSpec(current.type);
  const prevSpec = state.schema.nodeSpec(prev.type);

  if (currentSpec?.isolating || prevSpec?.isolating)
    return false;

  if (prevSpec?.content.kind !== 'text') {
    if (dispatch)
      dispatch(createTransaction(state).setSelection(nodeSelection([prev.id])));
    return true;
  }

  if (currentSpec?.content.kind !== 'text')
    return false;

  if (dispatch) {
    const caretOffset = inlineLength(nodeInline(prev));
    dispatch(createTransaction(state).mergeBlock(current.id, prev.id).setSelection(caret(prev.id, caretOffset)));
  }

  return true;
};

/** Delete at the end of a block: merge the next text block into it. */
export const joinForward: Command = (state, dispatch) => {
  const sel = state.selection;

  if (sel.kind !== 'text' || !isCollapsed(sel))
    return false;

  const current = blockById(state.doc, sel.focus.blockId);

  if (!current || sel.focus.offset !== inlineLength(nodeInline(current)))
    return false;

  const next = nextBlock(state.doc, current.id);
  if (!next)
    return false;

  const currentSpec = state.schema.nodeSpec(current.type);
  const nextSpec = state.schema.nodeSpec(next.type);

  if (currentSpec?.isolating || nextSpec?.isolating || currentSpec?.content.kind !== 'text' || nextSpec?.content.kind !== 'text')
    return false;

  if (dispatch) {
    const caretOffset = inlineLength(nodeInline(current));
    dispatch(createTransaction(state).mergeBlock(next.id, current.id).setSelection(caret(current.id, caretOffset)));
  }

  return true;
};
