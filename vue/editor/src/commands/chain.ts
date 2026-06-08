import type { Command } from '../state';

/**
 * Combine commands into one that runs them in order and stops at the first that
 * applies (returns `true`). The standard way to bind several fallbacks to a key.
 */
export function chainCommands(...commands: readonly Command[]): Command {
  return (state, dispatch, view) => {
    for (const command of commands) {
      if (command(state, dispatch, view))
        return true;
    }

    return false;
  };
}
