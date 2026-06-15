import type { Command, CommandView, Dispatch, WritekitState } from '../state';
import { eventToCombo } from './normalize';

/**
 * Look up and run the command bound to a keydown event. Returns `true` when a
 * command handled it (the caller should then `preventDefault`).
 */
export function runKeydown(
  event: KeyboardEvent,
  compiled: Map<string, Command>,
  state: WritekitState,
  dispatch: Dispatch,
  view: CommandView,
): boolean {
  const command = compiled.get(eventToCombo(event));
  return command ? command(state, dispatch, view) : false;
}
