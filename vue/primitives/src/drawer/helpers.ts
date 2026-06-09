import type { DrawerDirection } from './types';

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
