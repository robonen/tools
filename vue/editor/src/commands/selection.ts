import {
  blockById,
  blockIndex,
  caret,
  createNode,
  inlineLength,
  isAcrossBlocks,
  isCollapsed,
  nodeInline,
  nodeSelection,
  orderedSelection,
  previousBlock,
  textSelection,
} from '../model';
import type { Command, EditorState } from '../state';
import { createTransaction } from '../state';

function defaultTextType(state: EditorState): string {
  if (state.registry.hasBlock('paragraph'))
    return 'paragraph';

  for (const def of state.registry.listBlocks()) {
    if (def.spec.content.kind === 'text')
      return def.type;
  }

  return state.registry.listBlocks()[0]?.type ?? 'paragraph';
}

/**
 * Delete the current selection. Handles a node (block-level) selection, a
 * same-block range, and a cross-block range (delete the partial ends, drop the
 * blocks in between, merge the last block into the first). Never leaves an empty
 * document — a fresh paragraph is inserted if everything was removed.
 */
export const deleteSelection: Command = (state, dispatch) => {
  const sel = state.selection;

  if (sel.kind === 'node') {
    if (sel.ids.length === 0)
      return false;

    if (dispatch) {
      const before = previousBlock(state.doc, sel.ids[0]!);
      const tr = createTransaction(state);

      for (const id of sel.ids)
        tr.removeBlock(id);

      if (tr.doc.content.length === 0) {
        const type = defaultTextType(state);
        const node = createNode(type, { attrs: state.schema.defaultAttrs(type) });
        tr.insertBlock(node, 0).setSelection(caret(node.id, 0));
      }
      else if (before) {
        tr.setSelection(caret(before.id, inlineLength(nodeInline(before))));
      }
      else {
        tr.setSelection(caret(tr.doc.content[0]!.id, 0));
      }

      dispatch(tr);
    }

    return true;
  }

  if (isCollapsed(sel))
    return false;

  const { from, to } = orderedSelection(sel, state.doc);

  if (!isAcrossBlocks(sel)) {
    if (dispatch)
      dispatch(createTransaction(state).deleteText(from.blockId, from.offset, to.offset).setSelection(caret(from.blockId, from.offset)));
    return true;
  }

  const a = blockById(state.doc, from.blockId);
  const b = blockById(state.doc, to.blockId);

  if (!a || !b || state.schema.nodeSpec(a.type)?.content.kind !== 'text' || state.schema.nodeSpec(b.type)?.content.kind !== 'text')
    return false;

  if (dispatch) {
    const tr = createTransaction(state);
    tr.deleteText(a.id, from.offset, inlineLength(nodeInline(a)));
    tr.deleteText(b.id, 0, to.offset);

    const ai = blockIndex(state.doc, a.id);
    const bi = blockIndex(state.doc, b.id);
    for (const mid of state.doc.content.slice(ai + 1, bi))
      tr.removeBlock(mid.id);

    tr.mergeBlock(b.id, a.id).setSelection(caret(a.id, from.offset));
    dispatch(tr);
  }

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
