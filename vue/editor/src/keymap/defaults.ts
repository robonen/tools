import {
  chainCommands,
  deleteSelection,
  indentListItem,
  insertHardBreak,
  joinBackward,
  joinForward,
  moveBlockDown,
  moveBlockUp,
  outdentListItem,
  selectAll,
  setBlockType,
  splitBlock,
  toggleBlockType,
  toggleMark,
} from '../commands';
import type { Command, Editor } from '../state';
import type { Keymap } from './types';

/**
 * The standard editor keymap. Mark/heading shortcuts are no-ops when the mark or
 * block type isn't registered. Enter/Backspace/Delete are no-ops except at block
 * boundaries, so ordinary intra-block editing stays native. Arrow navigation and
 * cross-block selection are fully native (one contenteditable spans the doc).
 */
export function defaultKeymap(editor: Editor): Keymap {
  const undo: Command = () => editor.undo();
  const redo: Command = () => editor.redo();

  const keymap: Keymap = {
    'Mod-b': toggleMark('bold'),
    'Mod-i': toggleMark('italic'),
    'Mod-u': toggleMark('underline'),
    'Mod-Shift-s': toggleMark('strike'),
    'Mod-e': toggleMark('code'),
    'Mod-z': undo,
    'Mod-Shift-z': redo,
    'Mod-y': redo,
    Enter: splitBlock,
    'Shift-Enter': insertHardBreak,
    Backspace: chainCommands(deleteSelection, joinBackward),
    Delete: chainCommands(deleteSelection, joinForward),
    'Mod-a': selectAll,
    Tab: indentListItem,
    'Shift-Tab': outdentListItem,
    'Mod-Shift-ArrowUp': moveBlockUp,
    'Mod-Shift-ArrowDown': moveBlockDown,
    'Mod-Alt-0': setBlockType('paragraph'),
  };

  for (let level = 1; level <= 6; level++)
    keymap[`Mod-Alt-${level}`] = toggleBlockType('heading', { level });

  return keymap;
}
