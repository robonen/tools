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
  /** Pop the latest undo entry (and push it onto the redo stack). */
  undo: () => HistoryEntry | undefined;
  /** Pop the latest redo entry (and push it back onto the undo stack). */
  redo: () => HistoryEntry | undefined;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

export function createHistory(options: HistoryOptions = {}): History {
  const maxSize = options.maxSize ?? 200;
  const undoStack: HistoryEntry[] = [];
  const redoStack: HistoryEntry[] = [];

  return {
    record(entry) {
      undoStack.push(entry);
      if (undoStack.length > maxSize)
        undoStack.shift();
      redoStack.length = 0;
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
    },
  };
}
