import type { DrawerDirection } from './types';
import { WINDOW_TOP_OFFSET } from './constants';

/**
 * Whether a direction runs along the vertical axis (`top`/`bottom`) as opposed
 * to the horizontal axis (`left`/`right`). Used to pick the axis for translation
 * reads/writes and window dimension.
 */
export function isVertical(direction: DrawerDirection): boolean {
  return direction === 'top' || direction === 'bottom';
}

/**
 * Logarithmic resistance applied when dragging the drawer past its open
 * position, so it follows the pointer with diminishing returns (rubber-band).
 */
export function dampenValue(v: number): number {
  return 8 * (Math.log(v + 1) - 2);
}

/**
 * Resolves the app wrapper that the background-scale effect transforms. Consumers
 * opt in by adding `data-drawer-wrapper` to the element that holds their page
 * content (sibling to the portalled drawer).
 */
export function getDrawerWrapper(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-drawer-wrapper]');
}

/**
 * The background-scale factor for a given window width (the stacked-card look
 * leaves {@link WINDOW_TOP_OFFSET}px of the page peeking out).
 */
export function getScaleFactor(windowWidth: number): number {
  return (windowWidth - WINDOW_TOP_OFFSET) / windowWidth;
}

/**
 * A GPU-friendly translate along an axis, from a pre-resolved axis flag — the
 * drag hot path variant: no direction-string comparisons per frame.
 */
export function translateAxis(vertical: boolean, value: number): string {
  return vertical
    ? `translate3d(0, ${value}px, 0)`
    : `translate3d(${value}px, 0, 0)`;
}

/**
 * {@link translateAxis} keyed by direction, for cold paths that hold the
 * direction string rather than a gesture snapshot.
 */
export function translate3d(direction: DrawerDirection, value: number): string {
  return translateAxis(isVertical(direction), value);
}

/**
 * Per-frame single-property transform write for the drag hot path. Unlike
 * `setStyle` this allocates nothing (no patch object, no `Object.entries`, no
 * restore snapshot) — restoration is handled wholesale on release.
 */
export function writeTransform(element: HTMLElement | undefined | null, value: string): void {
  if (element)
    element.style.transform = value;
}
