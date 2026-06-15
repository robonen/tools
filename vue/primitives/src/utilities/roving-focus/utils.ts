import type { Direction } from '../config-provider';
import { getActiveElement } from '@robonen/platform/browsers';

export type Orientation = 'horizontal' | 'vertical';

/** Custom event dispatched when focus enters a `RovingFocusGroup` for the first time. */
export const ENTRY_FOCUS = 'rovingFocusGroup.onEntryFocus';

/** Event options for `ENTRY_FOCUS` — non-bubbling, cancelable. */
export const EVENT_OPTIONS = { bubbles: false, cancelable: true } as const;

export type FocusIntent = 'first' | 'last' | 'prev' | 'next';

const MAP_KEY_TO_FOCUS_INTENT: Record<string, FocusIntent> = {
  ArrowLeft: 'prev',
  ArrowUp: 'prev',
  ArrowRight: 'next',
  ArrowDown: 'next',
  PageUp: 'first',
  Home: 'first',
  PageDown: 'last',
  End: 'last',
};

/**
 * For RTL: swaps `ArrowLeft`/`ArrowRight`. Leaves other keys untouched.
 */
export function getDirectionAwareKey(key: string, dir?: Direction): string {
  if (dir !== 'rtl') return key;
  if (key === 'ArrowLeft') return 'ArrowRight';
  if (key === 'ArrowRight') return 'ArrowLeft';
  return key;
}

/**
 * Resolves a `FocusIntent` from a keyboard event, respecting `orientation`
 * and `dir`. Returns `undefined` if the key has no mapping or conflicts with
 * the orientation (e.g. `ArrowUp` in a horizontal group).
 */
export function getFocusIntent(
  event: KeyboardEvent,
  orientation?: Orientation,
  dir?: Direction,
): FocusIntent | undefined {
  const key = getDirectionAwareKey(event.key, dir);

  if (orientation === 'vertical' && (key === 'ArrowLeft' || key === 'ArrowRight'))
    return undefined;
  if (orientation === 'horizontal' && (key === 'ArrowUp' || key === 'ArrowDown'))
    return undefined;

  return MAP_KEY_TO_FOCUS_INTENT[key];
}

/**
 * Focuses the first element from `candidates` that actually accepts focus.
 * No-op if the currently focused element is already a candidate.
 */
export function focusFirst(candidates: HTMLElement[], preventScroll = false): void {
  const previouslyFocused = getActiveElement();
  for (const candidate of candidates) {
    if (candidate === previouslyFocused) return;
    candidate.focus({ preventScroll });
    if (getActiveElement() !== previouslyFocused) return;
  }
}

/**
 * Rotates `array` so that the element at `startIndex` becomes first.
 *
 * @example
 * wrapArray(['a','b','c','d'], 2) // => ['c','d','a','b']
 */
export function wrapArray<T>(array: T[], startIndex: number): T[] {
  const len = array.length;
  if (len === 0) return array;
  return Array.from({ length: len }, (_, i) => array[(startIndex + i) % len]!);
}
