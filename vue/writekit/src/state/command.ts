import type { WritekitState } from './writekit-state';
import type { Transaction } from './transaction';

/** Applies a transaction, updating writekit state and notifying subscribers. */
export type Dispatch = (tr: Transaction) => void;

/**
 * Minimal view surface a command may use to move real DOM focus across blocks.
 * The Vue `WritekitContext` is structurally compatible; pure logic/tests can pass
 * a stub. Keeps the command layer free of any Vue/DOM dependency.
 */
export interface CommandView {
  focusBlock: (blockId: string, offset: number | 'start' | 'end') => void;
}

/**
 * A command in the ProseMirror style: returns `true` when applicable (and
 * dispatches when `dispatch` is provided), `false` otherwise so the keymap can
 * fall through to native behavior. Called without `dispatch` it is a dry run for
 * computing UI enabled/active state.
 */
export type Command = (state: WritekitState, dispatch?: Dispatch, view?: CommandView) => boolean;

/** A parameterized command constructor. */
export type CommandFactory<Args extends readonly unknown[] = readonly unknown[]> = (...args: Args) => Command;
