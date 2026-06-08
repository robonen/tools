import type { Attrs, Mark } from '../model';
import { blockById, isCollapsed, marksAt, nodeInline, normalizeMarks, orderedSelection, rangeHasMarkType } from '../model';
import { marksAllowed } from '../schema';
import type { Command, EditorState } from '../state';
import { createTransaction } from '../state';

/** Whether the focused block permits a mark of `type` (false for code blocks, etc.). */
function markAllowedAtFocus(state: EditorState, type: string): boolean {
  if (state.selection.kind !== 'text')
    return false;

  const block = blockById(state.doc, state.selection.focus.blockId);
  const spec = block && state.schema.nodeSpec(block.type);
  return spec ? marksAllowed(spec, type) : false;
}

function excludedTypes(state: Parameters<Command>[0], type: string): readonly string[] {
  const excludes = state.schema.markSpec(type)?.excludes;

  if (excludes === '_all')
    return state.registry.listMarks().map(def => def.type).filter(other => other !== type);

  return excludes ?? [];
}

/**
 * Toggle a mark. On a collapsed caret it flips the stored marks (applied to the
 * next typed character); on a range it adds/removes the mark across it, honoring
 * the mark's `excludes`. Cross-block ranges are deferred to M2 (returns false).
 */
export function toggleMark(type: string, attrs?: Attrs): Command {
  return (state, dispatch) => {
    if (!state.registry.hasMark(type) || !markAllowedAtFocus(state, type))
      return false;

    const sel = state.selection;
    if (sel.kind !== 'text')
      return false;

    const mark: Mark = attrs ? { type, attrs } : { type };

    if (isCollapsed(sel)) {
      if (dispatch) {
        const block = blockById(state.doc, sel.focus.blockId);
        const current = state.storedMarks ?? (block ? marksAt(nodeInline(block), sel.focus.offset) : []);
        const has = current.some(m => m.type === type);
        const next = has
          ? current.filter(m => m.type !== type)
          : normalizeMarks([...current.filter(m => !excludedTypes(state, type).includes(m.type)), mark]);
        dispatch(createTransaction(state).setStoredMarks(next));
      }

      return true;
    }

    if (sel.anchor.blockId !== sel.focus.blockId)
      return false;

    const block = blockById(state.doc, sel.focus.blockId);
    if (!block)
      return false;

    const { from, to } = orderedSelection(sel, state.doc);
    const active = rangeHasMarkType(nodeInline(block), from.offset, to.offset, type);

    if (dispatch) {
      const tr = createTransaction(state);

      if (active) {
        tr.removeMark(block.id, from.offset, to.offset, mark);
      }
      else {
        for (const ex of excludedTypes(state, type))
          tr.removeMark(block.id, from.offset, to.offset, { type: ex });
        tr.addMark(block.id, from.offset, to.offset, mark);
      }

      tr.setSelection(sel);
      dispatch(tr);
    }

    return true;
  };
}

/** Add a mark across the current (same-block) range. */
export function addMark(type: string, attrs?: Attrs): Command {
  return (state, dispatch) => {
    const sel = state.selection;

    if (!state.registry.hasMark(type) || !markAllowedAtFocus(state, type) || sel.kind !== 'text' || isCollapsed(sel) || sel.anchor.blockId !== sel.focus.blockId)
      return false;

    if (dispatch) {
      const { from, to } = orderedSelection(sel, state.doc);
      dispatch(createTransaction(state)
        .addMark(from.blockId, from.offset, to.offset, attrs ? { type, attrs } : { type })
        .setSelection(sel));
    }

    return true;
  };
}

/** Remove a mark across the current (same-block) range. */
export function removeMark(type: string): Command {
  return (state, dispatch) => {
    const sel = state.selection;

    if (sel.kind !== 'text' || isCollapsed(sel) || sel.anchor.blockId !== sel.focus.blockId)
      return false;

    if (dispatch) {
      const { from, to } = orderedSelection(sel, state.doc);
      dispatch(createTransaction(state)
        .removeMark(from.blockId, from.offset, to.offset, { type })
        .setSelection(sel));
    }

    return true;
  };
}
