/**
 * Shared roving-focus helpers used by RadioGroup, Toolbar, ToggleGroup, etc.
 * Items register themselves; Root owns the current "tabStop" index and responds
 * to arrow/Home/End keys.
 */

export type RovingOrientation = 'horizontal' | 'vertical' | 'both';
export type RovingDirection = 'ltr' | 'rtl';

export interface RovingKeyOptions {
  orientation?: RovingOrientation;
  dir?: RovingDirection;
  loop?: boolean;
}

/** Map a keyboard event to a direction delta (-1 / 0 / +1) or 'home'/'end'. */
export function rovingKeyToAction(
  event: KeyboardEvent,
  { orientation = 'both', dir = 'ltr', loop = true }: RovingKeyOptions = {},
): { delta: number; absolute?: 'home' | 'end' } | null {
  const horizontal = orientation === 'horizontal' || orientation === 'both';
  const vertical = orientation === 'vertical' || orientation === 'both';
  switch (event.key) {
    case 'ArrowRight':
      if (!horizontal) return null;
      return { delta: dir === 'rtl' ? -1 : 1 };
    case 'ArrowLeft':
      if (!horizontal) return null;
      return { delta: dir === 'rtl' ? 1 : -1 };
    case 'ArrowDown':
      if (!vertical) return null;
      return { delta: 1 };
    case 'ArrowUp':
      if (!vertical) return null;
      return { delta: -1 };
    case 'Home':
      return { delta: 0, absolute: 'home' };
    case 'End':
      return { delta: 0, absolute: 'end' };
    default:
      return null;
  }
  // loop used by caller to decide clamp vs wrap.
  void loop;
}

/** Resolve next index given current, delta and items count with optional loop. */
export function resolveNextIndex(current: number, delta: number, count: number, loop: boolean): number {
  if (count <= 0) return -1;
  let next = current + delta;
  if (loop) {
    next = ((next % count) + count) % count;
  }
  else {
    next = Math.max(0, Math.min(count - 1, next));
  }
  return next;
}
