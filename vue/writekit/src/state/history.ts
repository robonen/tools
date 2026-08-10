import type { Selection } from '../model';
import type { Step } from './step';

/**
 * One undoable change: the steps it applied, their inverses, and the selection
 * before and after. Undo replays `inverted` (reversed); redo replays `steps`.
 */
export interface HistoryEntry {
  readonly steps: readonly Step[];
  readonly inverted: readonly Step[];
  readonly selectionBefore: Selection;
  readonly selectionAfter: Selection;
}

export interface HistoryOptions {
  /** Maximum number of undo entries to retain (default 200). */
  readonly maxSize?: number;
  /**
   * Coalesce a new entry into the previous one when both are plain typing in
   * the same block and land within this window (ms). One keystroke per
   * transaction otherwise makes Ctrl+Z a character-by-character crawl, and a
   * short paragraph evicts the whole earlier history through `maxSize`.
   * `0` disables coalescing. @default 500
   */
  readonly coalesceMs?: number;
}

/**
 * Undo/redo stacks of inverse-step entries. Borrows the ergonomics of stdlib's
 * command history (bounded size, redo cleared on a new edit) but stores data
 * (inverse steps) rather than closures — which is what makes it serializable and
 * collab-friendly.
 */
export interface History {
  /** Record a new edit, clearing the redo stack. */
  record: (entry: HistoryEntry) => void;
  /**
   * Break the coalescing chain: the next recorded entry starts its own group.
   * Called for anything that lands between recordings (a remote change, an
   * undo/redo, a selection jump) — merging across such a boundary would splice
   * foreign state into one undo press.
   */
  interrupt: () => void;
  /** Pop the latest undo entry (and push it onto the redo stack). */
  undo: () => HistoryEntry | undefined;
  /** Pop the latest redo entry (and push it back onto the undo stack). */
  redo: () => HistoryEntry | undefined;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

/** Plain typing: text-only steps confined to a single block. */
function typingBlockOf(steps: readonly Step[]): string | null {
  let block: string | null = null;

  for (const step of steps) {
    if (step.type !== 'insertInline' && step.type !== 'deleteText' && step.type !== 'replaceInline')
      return null;

    if (block === null)
      block = step.blockId;
    else if (block !== step.blockId)
      return null;
  }

  return block;
}

export function createHistory(options: HistoryOptions = {}): History {
  const maxSize = options.maxSize ?? 200;
  const coalesceMs = options.coalesceMs ?? 500;
  const undoStack: HistoryEntry[] = [];
  const redoStack: HistoryEntry[] = [];

  let lastRecordAt = 0;
  let lastTypingBlock: string | null = null;

  /**
   * Concatenation preserves the replay invariant: `inverted` is stored in
   * application order and replayed reversed, so a merged entry undoes the
   * later keystrokes first — exactly as separate entries would, in one press.
   */
  function coalesce(top: HistoryEntry, entry: HistoryEntry): HistoryEntry {
    return {
      steps: [...top.steps, ...entry.steps],
      inverted: [...top.inverted, ...entry.inverted],
      selectionBefore: top.selectionBefore,
      selectionAfter: entry.selectionAfter,
    };
  }

  return {
    record(entry) {
      const now = Date.now();
      const block = typingBlockOf(entry.steps);
      const top = undoStack[undoStack.length - 1];

      const mergeable
        = coalesceMs > 0
          && top !== undefined
          && block !== null
          && block === lastTypingBlock
          && now - lastRecordAt <= coalesceMs;

      if (mergeable) {
        undoStack[undoStack.length - 1] = coalesce(top, entry);
      }
      else {
        undoStack.push(entry);
        if (undoStack.length > maxSize)
          undoStack.shift();
      }

      lastRecordAt = now;
      lastTypingBlock = block;
      redoStack.length = 0;
    },
    interrupt() {
      lastTypingBlock = null;
    },
    undo() {
      const entry = undoStack.pop();
      if (entry)
        redoStack.push(entry);
      return entry;
    },
    redo() {
      const entry = redoStack.pop();
      if (entry)
        undoStack.push(entry);
      return entry;
    },
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
    clear() {
      undoStack.length = 0;
      redoStack.length = 0;
      lastTypingBlock = null;
    },
  };
}
