import type { Attrs, Node } from '../model';
import { blockById, blockIndex, caret, findBlock, inlineLength, moveBefore, nodeInline, nodeSelection, withFreshIds } from '../model';
import type { Command } from '../state';
import { createTransaction } from '../state';
import { focusBlock, isBlockActive, isTextBlockType, selectionBlockId } from './util';

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

/** Convert one block by id (the gutter menu's "turn into"), keeping its inline content. */
export function convertBlock(blockId: string, type: string, attrs?: Attrs): Command {
  return (state, dispatch) => {
    const block = blockById(state.doc, blockId);

    if (!block || !state.registry.hasBlock(type) || !isTextBlockType(state, type))
      return false;

    if (dispatch) {
      const sel = state.selection;
      const keep = sel.kind === 'text' && sel.focus.blockId === blockId;
      dispatch(createTransaction(state)
        .setBlockType(blockId, type, attrs)
        .setSelection(keep ? sel : caret(blockId, inlineLength(nodeInline(block)))));
    }

    return true;
  };
}

/** Insert a copy of a block right after it, under a fresh id. */
export function duplicateBlock(blockId: string): Command {
  return (state, dispatch) => {
    const found = findBlock(state.doc, blockId);

    if (!found)
      return false;

    if (dispatch) {
      const copy = withFreshIds([found.node])[0]!;
      const text = isTextBlockType(state, copy.type);
      dispatch(createTransaction(state)
        .insertBlock(copy, found.index + 1)
        .setSelection(text ? caret(copy.id, inlineLength(nodeInline(copy))) : nodeSelection([copy.id])));
    }

    return true;
  };
}

/**
 * Insert `node` next to a block — below by default, above with `above`. The
 * caret lands at the end of a text node (so a node seeded with `/` opens the
 * slash menu), a void node is selected.
 */
export function insertBlockBeside(blockId: string, node: Node, options: { above?: boolean } = {}): Command {
  return (state, dispatch) => {
    const found = findBlock(state.doc, blockId);

    if (!found || !state.registry.hasBlock(node.type))
      return false;

    if (dispatch) {
      const text = isTextBlockType(state, node.type);
      dispatch(createTransaction(state)
        .insertBlock(node, options.above ? found.index : found.index + 1)
        .setSelection(text ? caret(node.id, inlineLength(nodeInline(node))) : nodeSelection([node.id])));
    }

    return true;
  };
}

/**
 * Move a set of blocks so they sit, in document order, before the block that
 * currently occupies `toIndex` (`content.length` means "at the end"). One
 * transaction, one undo entry; a drop that changes nothing is refused.
 */
export function moveBlocks(ids: readonly string[], toIndex: number): Command {
  return (state, dispatch) => {
    const moving = state.doc.content.filter(block => ids.includes(block.id));
    const next = moveBefore(state.doc.content, ids, toIndex);

    if (moving.length === 0 || next.every((block, i) => block === state.doc.content[i]))
      return false;

    // Anchor to a block, not an index: each move shifts the indexes after it.
    const boundary = state.doc.content.slice(toIndex).find(block => !ids.includes(block.id)) ?? null;

    if (dispatch) {
      const tr = createTransaction(state);

      for (const block of moving) {
        const from = blockIndex(tr.doc, block.id);
        const target = boundary ? blockIndex(tr.doc, boundary.id) : tr.doc.content.length;
        tr.moveBlock(block.id, from < target ? target - 1 : target);
      }

      dispatch(tr.setSelection(state.selection));
    }

    return true;
  };
}
