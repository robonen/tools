import { blockById, caret, inlineText, isCollapsed, nodeInline } from '../model';
import type { Command } from '../state';
import { createTransaction } from '../state';

/**
 * Apply the first matching block input-rule at the caret. Rules live on block
 * definitions (`inputRules`) and match the text from the block start to the
 * caret — e.g. `'# '` → heading, `'- '` → bulleted list, `'> '` → quote. Run
 * from the input flow after each text change.
 */
export const applyInputRule: Command = (state, dispatch) => {
  const sel = state.selection;

  if (sel.kind !== 'text' || !isCollapsed(sel))
    return false;

  const block = blockById(state.doc, sel.focus.blockId);
  const spec = block && state.schema.nodeSpec(block.type);

  if (!block || spec?.content.kind !== 'text' || spec.code)
    return false;

  const before = inlineText(nodeInline(block)).slice(0, sel.focus.offset);

  for (const def of state.registry.listBlocks()) {
    for (const rule of def.inputRules ?? []) {
      const match = rule.match.exec(before);

      if (!match)
        continue;

      const targetType = rule.type ?? def.type;
      if (block.type === targetType)
        return false; // already that type — leave the typed text alone

      if (dispatch) {
        dispatch(createTransaction(state)
          .deleteText(block.id, 0, match[0].length)
          .setBlockType(block.id, targetType, rule.attrs ?? state.schema.defaultAttrs(targetType))
          .setSelection(caret(block.id, 0)));
      }

      return true;
    }
  }

  return false;
};
