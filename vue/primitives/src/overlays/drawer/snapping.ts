import { clamp } from '@robonen/stdlib';
import type { DrawerDirection } from './types';
import { MAX_SNAP_VELOCITY, SNAP_VELOCITY_MULTIPLIER, SNAP_VELOCITY_THRESHOLD } from './constants';

const PX_RE = /^-?(?:\d+(?:\.\d+)?|\.\d+)px$/;
const REM_RE = /^-?(?:\d+(?:\.\d+)?|\.\d+)rem$/;

/**
 * Resolve a snap point to the visible size (px) it gives the drawer along the
 * drag axis:
 * - a number in (0, 1] is a fraction of the window dimension;
 * - a number above 1 is pixels;
 * - `'Npx'` / `'Nrem'` strings are pixels (rem scaled by the root font size).
 *
 * Unknown units (`'50%'`, `'10vh'`) and non-finite/non-positive results are
 * unsupported and resolve to `null` so they never reach the geometry as `NaN`.
 */
export function resolveSnapPointSize(
  point: number | string,
  windowSize: number,
  rootFontSize: number,
): number | null {
  let size: number | null = null;

  if (typeof point === 'number')
    size = point > 1 ? point : point * windowSize;
  else if (PX_RE.test(point))
    size = Number.parseFloat(point);
  else if (REM_RE.test(point))
    size = Number.parseFloat(point) * rootFontSize;

  if (size === null || !Number.isFinite(size) || size <= 0)
    return null;

  return Math.round(size);
}

/**
 * The inline translate (px, signed the way the drawer's transform is written)
 * that shows exactly `point` worth of the drawer: positive toward the
 * bottom/right edge, negative toward the top/left edge, clamped so a snap point
 * larger than the window rests at fully open. Unresolvable points map to `NaN`
 * — callers must `Number.isFinite`-guard before using an offset.
 */
export function resolveSnapPointOffset(
  point: number | string,
  direction: DrawerDirection,
  windowSize: number,
  rootFontSize: number,
): number {
  const size = resolveSnapPointSize(point, windowSize, rootFontSize);

  if (size === null)
    return Number.NaN;

  const distance = Math.max(Math.round(windowSize - size), 0);

  return direction === 'bottom' || direction === 'right' ? distance : -distance;
}

/**
 * Index of the active snap point: matched by identity first, then by resolved
 * size within a 1px tolerance, so a controlled drawer may use interchangeable
 * representations (`0.5` vs `'360px'` on a 720px window). Returns `null` when
 * nothing matches.
 */
export function findSnapPointIndex(
  snapPoints: Array<number | string>,
  active: number | string | null | undefined,
  windowSize: number,
  rootFontSize: number,
): number | null {
  if (active === null || active === undefined)
    return null;

  const byIdentity = snapPoints.indexOf(active);

  if (byIdentity !== -1)
    return byIdentity;

  const activeSize = resolveSnapPointSize(active, windowSize, rootFontSize);

  if (activeSize === null)
    return null;

  const bySize = snapPoints.findIndex((point) => {
    const size = resolveSnapPointSize(point, windowSize, rootFontSize);
    return size !== null && Math.abs(size - activeSize) <= 1;
  });

  return bySize === -1 ? null : bySize;
}

export interface SnapReleaseInput {
  /**
   * Snap offsets in dismiss-positive space: 0 is fully open, larger is more
   * hidden. `NaN` entries (unresolvable points) are skipped.
   */
  offsets: number[];
  activeIndex: number | null;
  /** Drag distance since press, positive toward open/expand. */
  draggedDistance: number;
  /** Instantaneous release velocity, positive toward dismiss (px/ms). */
  velocity: number;
  /** Drawer size (px) along the drag axis — the fully-closed offset. */
  drawerSize: number;
  dismissible: boolean;
  /** Step at most one snap point per gesture instead of jumping to the nearest. */
  sequential: boolean;
}

export type SnapReleaseResult = { type: 'close' } | { type: 'snap'; index: number };

/**
 * Where a snap-point drawer settles on release: the drag target is projected
 * ahead along the release velocity (a fling crosses points a slow drag would
 * not), then the nearest snap point wins — or the drawer closes when the
 * projection lands strictly closer to fully-closed and the drawer is
 * dismissible. In `sequential` mode the result is clamped to the snap point
 * adjacent to the active one.
 */
export function projectSnapRelease(input: SnapReleaseInput): SnapReleaseResult {
  const { offsets, activeIndex, draggedDistance, velocity, drawerSize, dismissible, sequential } = input;

  const active = activeIndex !== null && Number.isFinite(offsets[activeIndex])
    ? offsets[activeIndex]
    : 0;

  // Where the drag alone left the drawer, clamped to its travel range.
  const dragTarget = clamp(active - draggedDistance, 0, drawerSize);

  let target = dragTarget;

  if (Math.abs(velocity) >= SNAP_VELOCITY_THRESHOLD)
    target = dragTarget + clamp(velocity, -MAX_SNAP_VELOCITY, MAX_SNAP_VELOCITY) * SNAP_VELOCITY_MULTIPLIER;

  let closestIndex = -1;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const [index, offset] of offsets.entries()) {
    if (!Number.isFinite(offset))
      continue;

    const distance = Math.abs(target - offset);

    if (distance < closestDistance) {
      closestIndex = index;
      closestDistance = distance;
    }
  }

  if (closestIndex === -1)
    return { type: 'snap', index: activeIndex ?? 0 };

  if (dismissible && Math.abs(target - drawerSize) < closestDistance)
    return { type: 'close' };

  if (!sequential || activeIndex === null)
    return { type: 'snap', index: closestIndex };

  // Sequential mode: rank the usable points by offset and move at most one
  // step toward the drag; a fast fling or a physical crossing of the adjacent
  // point advances, anything else stays.
  const stepDirection = Math.sign(dragTarget - active);

  if (stepDirection === 0)
    return { type: 'snap', index: activeIndex };

  const order = offsets
    .map((offset, index) => ({ offset, index }))
    .filter(entry => Number.isFinite(entry.offset))
    .sort((a, b) => a.offset - b.offset);

  const rank = order.findIndex(entry => entry.index === activeIndex);

  if (rank === -1)
    return { type: 'snap', index: closestIndex };

  const adjacent = order[clamp(rank + stepDirection, 0, order.length - 1)];
  const flungPast = Math.sign(velocity) === stepDirection && Math.abs(velocity) >= SNAP_VELOCITY_THRESHOLD;
  const crossed = stepDirection > 0 ? target > adjacent.offset : target < adjacent.offset;

  return { type: 'snap', index: flungPast || crossed ? adjacent.index : activeIndex };
}
