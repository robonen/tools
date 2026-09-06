import { blockById, inlineLength, isAcrossBlocks, nodeInline, nodeSelection, orderedSelection, textSelection } from '../model';
import type { Command } from '../state';
import { createTransaction } from '../state';
import { deleteSelectionInto, ensureNotEmpty, selectionAfterRemoval } from './slice';

/**
 * Delete the current selection. Handles a node (block-level) selection, a
 * same-block range, and a cross-block range (delete the partial ends, drop the
 * blocks in between, merge the last block into the first). Never leaves an empty
 * document — a fresh paragraph is inserted if everything was removed.
 */
export const deleteSelection: Command = (state, dispatch) => {
  const tr = createTransaction(state);
  const anchor = deleteSelectionInto(tr, state);

  if (!anchor || tr.steps.length === 0)
    return false;

  tr.setSelection(anchor.kind === 'text' ? textSelection(anchor.at) : selectionAfterRemoval(tr, anchor.index));
  ensureNotEmpty(tr, state);
  dispatch?.(tr);
  return true;
};

/**
 * Progressive select-all (Mod+A): first press selects the current block's text,
 * a second press selects every block.
 */
export const selectAll: Command = (state, dispatch) => {
  const sel = state.selection;

  if (sel.kind === 'text' && !isAcrossBlocks(sel)) {
    const block = blockById(state.doc, sel.focus.blockId);

    if (block) {
      const length = inlineLength(nodeInline(block));
      const { from, to } = orderedSelection(sel, state.doc);
      const wholeBlock = from.offset === 0 && to.offset === length;

      if (!wholeBlock && length > 0) {
        if (dispatch) {
          dispatch(createTransaction(state).setSelection(
            textSelection({ blockId: block.id, offset: 0 }, { blockId: block.id, offset: length }),
          ));
        }
        return true;
      }
    }
  }

  if (state.doc.content.length === 0)
    return false;

  if (dispatch)
    dispatch(createTransaction(state).setSelection(nodeSelection(state.doc.content.map(block => block.id))));

  return true;
};
