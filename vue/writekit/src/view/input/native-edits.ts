import type { Command } from '../../state';
import {
  deleteSelection,
  indentListItem,
  insertHardBreak,
  outdentListItem,
  splitBlock,
  toggleMark,
} from '../../commands';

/**
 * The contract with the browser, as a closed list: it may perform these edits
 * itself — all of them stay inside one block's inline content — and the model
 * syncs from the DOM on `input`. Anything not listed here is either an edit
 * writekit performs as a command ({@link ownedEdit}) or is cancelled outright:
 * a paste, a drop, a horizontal rule, an "insert link" from a context menu —
 * the browser would rewrite block structure the model never agreed to.
 */
const NATIVE_INLINE = new Set([
  'insertText',
  'insertCompositionText',
  'insertReplacementText',
  'deleteContentBackward',
  'deleteContentForward',
  'deleteWordBackward',
  'deleteWordForward',
  'deleteSoftLineBackward',
  'deleteSoftLineForward',
  'deleteHardLineBackward',
  'deleteHardLineForward',
]);

export function isNativeInlineEdit(inputType: string): boolean {
  return NATIVE_INLINE.has(inputType);
}

/** Edits that insert the event's `data` — the ones a ranged selection turns into replace-with-text. */
export function isTextInsertion(inputType: string): boolean {
  return inputType === 'insertText' || inputType === 'insertReplacementText' || inputType === 'insertCompositionText';
}

/**
 * Which way a native deletion eats. At a block boundary the browser would
 * cross into the neighbouring block's DOM, so those cases go to the join
 * commands regardless of granularity (character, word, line).
 */
export function deletionDirection(inputType: string): 'backward' | 'forward' | null {
  if (!inputType.startsWith('delete'))
    return null;
  if (inputType.endsWith('Backward'))
    return 'backward';
  if (inputType.endsWith('Forward'))
    return 'forward';
  return null;
}

export interface HistoryCommands {
  readonly undo: Command;
  readonly redo: Command;
}

/**
 * Edits writekit performs as commands instead of the browser. `historyUndo`/
 * `historyRedo` arrive from the context menu and from platforms whose undo
 * shortcut never reaches the keymap; the `format*` family comes from native
 * shortcuts and menus on some platforms.
 */
export function ownedEdit(inputType: string, history: HistoryCommands): Command | undefined {
  switch (inputType) {
    case 'insertParagraph': return splitBlock;
    case 'insertLineBreak': return insertHardBreak;
    case 'historyUndo': return history.undo;
    case 'historyRedo': return history.redo;
    case 'formatBold': return toggleMark('bold');
    case 'formatItalic': return toggleMark('italic');
    case 'formatUnderline': return toggleMark('underline');
    case 'formatStrikeThrough': return toggleMark('strike');
    case 'formatIndent': return indentListItem;
    case 'formatOutdent': return outdentListItem;
    case 'deleteByCut':
    case 'deleteByDrag': return deleteSelection;
    default: return undefined;
  }
}
