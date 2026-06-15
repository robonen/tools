/**
 * The edge the drawer is anchored to and slides in from.
 */
export type DrawerDirection = 'top' | 'bottom' | 'left' | 'right';

/**
 * A resolved snap point: the original `fraction` (0–1 of the screen, or a raw
 * px value) paired with its computed pixel `height`.
 */
export interface SnapPoint {
  fraction: number;
  height: number;
}
