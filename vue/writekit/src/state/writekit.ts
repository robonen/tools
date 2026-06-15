import { PubSub } from '@robonen/stdlib';
import { selectionEq } from '../model';
import type { Command, Dispatch } from './command';
import type { WritekitState } from './writekit-state';
import type { HistoryOptions } from './history';
import { createHistory } from './history';
import type { Transaction } from './transaction';
import { applyTransaction, createTransaction } from './transaction';

/**
 * Writekit event map. A `type` (not `interface`) so it satisfies the
 * `Record<string, ...>` constraint of {@link PubSub}.
 */
export interface WritekitEvents {
  /** Fired for every applied transaction (local, undo/redo, or remote). */
  transaction: (tr: Transaction, next: WritekitState, prev: WritekitState) => void;
  /** Fired when the document changed. */
  docChange: (next: WritekitState, prev: WritekitState) => void;
  /** Fired when the selection changed. */
  selectionChange: (next: WritekitState, prev: WritekitState) => void;
}

/**
 * The headless writekit controller: owns live state, the undo history, and a
 * typed event bus. The Vue layer wraps it; the CRDT adapter subscribes to it.
 */
export interface Writekit {
  readonly state: WritekitState;
  dispatch: Dispatch;
  /** Run a command against the current state, dispatching if it applies. */
  command: (cmd: Command) => boolean;
  undo: () => boolean;
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
  on: <K extends keyof WritekitEvents>(event: K, listener: WritekitEvents[K]) => void;
  off: <K extends keyof WritekitEvents>(event: K, listener: WritekitEvents[K]) => void;
  destroy: () => void;
}

export interface CreateWritekitOptions {
  readonly state: WritekitState;
  readonly history?: HistoryOptions;
}

/** Create an {@link Writekit} around an initial state. */
export function createWritekit(options: CreateWritekitOptions): Writekit {
  let state = options.state;
  // A mapped type (not the `interface`) satisfies PubSub's `Record<string, …>` constraint.
  const bus = new PubSub<{ [K in keyof WritekitEvents]: WritekitEvents[K] }>();
  const history = createHistory(options.history);

  const dispatch: Dispatch = (tr) => {
    const prev = state;
    const next = applyTransaction(prev, tr);
    state = next;

    if (tr.meta.get('addToHistory') !== false && tr.steps.length > 0) {
      history.record({
        steps: tr.steps,
        inverted: tr.inverted,
        selectionBefore: prev.selection,
        selectionAfter: next.selection,
      });
    }

    bus.emit('transaction', tr, next, prev);
    if (next.doc !== prev.doc)
      bus.emit('docChange', next, prev);
    if (!selectionEq(next.selection, prev.selection))
      bus.emit('selectionChange', next, prev);
  };

  return {
    get state() {
      return state;
    },
    dispatch,
    command: cmd => cmd(state, dispatch),
    undo() {
      const entry = history.undo();
      if (!entry)
        return false;

      const tr = createTransaction(state);
      for (let i = entry.inverted.length - 1; i >= 0; i--)
        tr.step(entry.inverted[i]!);

      tr.setSelection(entry.selectionBefore).setMeta('addToHistory', false).setMeta('history', 'undo');
      dispatch(tr);
      return true;
    },
    redo() {
      const entry = history.redo();
      if (!entry)
        return false;

      const tr = createTransaction(state);
      for (const step of entry.steps)
        tr.step(step);

      tr.setSelection(entry.selectionAfter).setMeta('addToHistory', false).setMeta('history', 'redo');
      dispatch(tr);
      return true;
    },
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    on(event, listener) {
      bus.on(event, listener);
    },
    off(event, listener) {
      bus.off(event, listener);
    },
    destroy() {
      bus.clear('transaction').clear('docChange').clear('selectionChange');
      history.clear();
    },
  };
}
