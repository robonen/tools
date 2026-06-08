import type { Attrs } from '../model';
import { blockById, blockIndex } from '../model';
import type { Command } from '../state';
import { createTransaction } from '../state';
import { focusBlock, isBlockActive, selectionBlockId } from './util';

/** Convert the focused block to `type` (preserving inline content). */
export function setBlockType(type: string, attrs?: Attrs): Command {
  return (state, dispatch) => {
    const blockId = selectionBlockId(state);

    if (!blockId || !state.registry.hasBlock(type))
      return false;

    if (dispatch)
      dispatch(createTransaction(state).setBlockType(blockId, type, attrs).setSelection(state.selection));

    return true;
  };
}

/**
 * Toggle the focused block between `type` (with `attrs`) and a fallback type
 * (default `paragraph`). Powers heading shortcuts and conversion toggles.
 */
export function toggleBlockType(type: string, attrs?: Attrs, fallback = 'paragraph'): Command {
  return (state, dispatch) => {
    const blockId = selectionBlockId(state);

    if (!blockId)
      return false;

    const active = isBlockActive(state, type, attrs);
    const target = active ? fallback : type;
    const targetAttrs = active ? undefined : attrs;

    if (!state.registry.hasBlock(target))
      return false;

    if (dispatch)
      dispatch(createTransaction(state).setBlockType(blockId, target, targetAttrs).setSelection(state.selection));

    return true;
  };
}

function moveFocusedBlock(delta: number): Command {
  return (state, dispatch) => {
    const block = focusBlock(state);

    if (!block)
      return false;

    const index = blockIndex(state.doc, block.id);
    const target = index + delta;

    if (index === -1 || target < 0 || target >= state.doc.content.length)
      return false;

    if (dispatch)
      dispatch(createTransaction(state).moveBlock(block.id, target).setSelection(state.selection));

    return true;
  };
}

/** Move the focused block one position earlier. */
export const moveBlockUp: Command = moveFocusedBlock(-1);

/** Move the focused block one position later. */
export const moveBlockDown: Command = moveFocusedBlock(1);

/** Indent a list item by raising its `indent` attr (lists only). */
export const indentListItem: Command = (state, dispatch) => {
  const block = focusBlock(state);

  if (!block || state.schema.nodeSpec(block.type)?.group !== 'list')
    return false;

  const indent = typeof block.attrs.indent === 'number' ? block.attrs.indent : 0;

  if (indent >= 8)
    return false;

  if (dispatch)
    dispatch(createTransaction(state).setAttrs(block.id, { indent: indent + 1 }).setSelection(state.selection));

  return true;
};

/** Outdent a list item by lowering its `indent` attr (lists only). */
export const outdentListItem: Command = (state, dispatch) => {
  const block = focusBlock(state);

  if (!block || state.schema.nodeSpec(block.type)?.group !== 'list')
    return false;

  const indent = typeof block.attrs.indent === 'number' ? block.attrs.indent : 0;

  if (indent <= 0)
    return false;

  if (dispatch)
    dispatch(createTransaction(state).setAttrs(block.id, { indent: indent - 1 }).setSelection(state.selection));

  return true;
};

/** Toggle the `checked` attribute of the focused to-do item. */
export const toggleChecked: Command = (state, dispatch) => {
  const block = focusBlock(state);

  if (!block || !('checked' in block.attrs))
    return false;

  if (dispatch)
    dispatch(createTransaction(state).setAttrs(block.id, { checked: !block.attrs['checked'] }).setSelection(state.selection));

  return true;
};

/** Delete a specific block by id (used by atom-block UIs). */
export function removeBlock(blockId: string): Command {
  return (state, dispatch) => {
    if (!blockById(state.doc, blockId))
      return false;

    if (dispatch)
      dispatch(createTransaction(state).removeBlock(blockId));

    return true;
  };
}
