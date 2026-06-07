import type { VoidFunction } from '@robonen/stdlib';
import { noop } from '@robonen/stdlib';
import { useEventListener } from '@/composables/browser/useEventListener';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';
import { defaultWindow } from '@/types';

type EscapeListener = (event: KeyboardEvent) => void;

// Module-scoped stack: only the topmost non-paused layer handles Escape so that
// nested dismissables behave correctly (top-most dialog closes first).
const stack: EscapeListener[] = [];
let installed = false;
let cleanup: VoidFunction = noop;

function install() {
  if (installed || !defaultWindow) return;
  installed = true;

  cleanup = useEventListener(defaultWindow, 'keydown', (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;

    const top = stack.at(-1);
    top?.(event);
  }, { capture: true });
}

function uninstall() {
  if (!installed || stack.length > 0) return;
  installed = false;
  cleanup();
  cleanup = noop;
}

/**
 * @name useEscapeKey
 * @category Browser
 * @description Register a callback for the topmost Escape keydown. Uses an internal
 * stack so that nested layers (e.g. nested Dialogs) dismiss in the correct order —
 * only the most recently-registered listener fires for a given keydown.
 *
 * @param {(event: KeyboardEvent) => void} handler Callback invoked on the topmost Escape
 * @returns {VoidFunction} Stop handle that removes the subscription
 *
 * @since 0.0.14
 */
export function useEscapeKey(handler: EscapeListener): VoidFunction {
  if (!defaultWindow) return noop;

  install();
  stack.push(handler);

  const stop = () => {
    const i = stack.lastIndexOf(handler);
    if (i !== -1) stack.splice(i, 1);
    uninstall();
  };

  tryOnScopeDispose(stop);
  return stop;
}
