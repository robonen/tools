import type { Point } from '../../internal/utils/geometry';

// Reuse the package-canonical 2D point (internal `utils/geometry`, not in the
// root barrel) so transform-box's `Point` is the SAME symbol as
// spline/pointer-drag/snapping/angle-dial re-export — keeps the root barrel free
// of a TS2308 `Point` clash.
/** A 2D point. Client (screen) pixels unless the call site says otherwise. */
export type { Point };

const TAU = Math.PI * 2;
const DEG_TO_RAD = TAU / 360;

/**
 * The full transform a {@link TransformBoxRoot} owns: an axis-aligned box
 * `{x, y, width, height}` in the box's UNROTATED local frame plus a `rotation`
 * (degrees, clockwise-positive to match screen-y-down). The box is drawn by
 * translating to `(x, y)`, then rotating by `rotation` about the pivot.
 *
 * Width/height may be negative mid-gesture when a corner is dragged past its
 * anchor (a flip); {@link normalizeTransform} folds a negative size back into a
 * positive one by shifting the origin, which is what the root commits.
 */
export interface TransformBoxValue {
  /** Left edge in the unrotated local frame. */
  x: number;
  /** Top edge in the unrotated local frame. */
  y: number;
  /** Box width (may be transiently negative during a flip). */
  width: number;
  /** Box height (may be transiently negative during a flip). */
  height: number;
  /** Rotation in degrees, clockwise-positive (screen y grows downward). */
  rotation: number;
}

/** The 8 resize handle positions: 4 edges + 4 corners. */
export type TransformBoxHandlePosition
  = | 'top'
    | 'right'
    | 'bottom'
    | 'left'
    | 'top-left'
    | 'top-right'
    | 'bottom-right'
    | 'bottom-left';

/**
 * Pivot the box rotates about and that symmetric (Alt) resize anchors to.
 * `'center'` is the box center; an explicit {@link Point} is a fractional
 * position in `[0, 1]²` of the box (e.g. `{ x: 0, y: 0 }` is the top-left
 * corner, `{ x: 0.5, y: 0.5 }` equals `'center'`).
 */
export type TransformBoxPivot = 'center' | Point;

/** Whether a handle controls the left/right (x) and top/bottom (y) edges. */
interface HandleAxes {
  /** `-1` left edge, `1` right edge, `0` neither (no horizontal resize). */
  x: -1 | 0 | 1;
  /** `-1` top edge, `1` bottom edge, `0` neither (no vertical resize). */
  y: -1 | 0 | 1;
}

/**
 * Decode a handle position into which edges it drives. Corners drive both axes;
 * edge handles drive one. The sign points OUTWARD from the box center toward the
 * handle (so `right` is `+1`, `left` is `-1`).
 */
export function handleAxes(position: TransformBoxHandlePosition): HandleAxes {
  let x: -1 | 0 | 1 = 0;
  let y: -1 | 0 | 1 = 0;
  if (position.includes('left')) x = -1;
  else if (position.includes('right')) x = 1;
  if (position.includes('top')) y = -1;
  else if (position.includes('bottom')) y = 1;
  return { x, y };
}

/** Default human-readable `aria-label` for a scale handle (e.g. "Resize top-left"). */
export function handleLabel(position: TransformBoxHandlePosition): string {
  return `Resize ${position}`;
}

/**
 * Rotate `point` by `angleDeg` (clockwise-positive, screen y down) about
 * `origin`. Pure; the workhorse for moving between world and the box's local
 * frame. Rotating by `-rotation` brings a world vector into local axes;
 * rotating by `+rotation` sends a local point back to world.
 */
export function rotatePoint(point: Point, angleDeg: number, origin: Point = { x: 0, y: 0 }): Point {
  const rad = angleDeg * DEG_TO_RAD;
  // Screen y grows downward, so a positive (clockwise) rotation uses the
  // standard matrix with +sin on the y row: [c -s; s c].
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos,
  };
}

/**
 * Rotate a free VECTOR (no origin) by `angleDeg`. Equivalent to
 * `rotatePoint(vec, angleDeg)`; named separately because handle math rotates a
 * screen-space delta into the box's local axes (`angleDeg = -rotation`) and the
 * intent reads more clearly as "rotate this delta".
 */
export function rotateVector(vec: Point, angleDeg: number): Point {
  return rotatePoint(vec, angleDeg);
}

/**
 * Resolve a {@link TransformBoxPivot} to an absolute point in the box's local
 * (unrotated) frame, given the box's `x/y/width/height`. `'center'` maps to the
 * geometric center; a fractional point maps to that fraction of the box.
 */
export function resolvePivot(box: TransformBoxValue, pivot: TransformBoxPivot): Point {
  if (pivot === 'center') {
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }
  return { x: box.x + box.width * pivot.x, y: box.y + box.height * pivot.y };
}

/**
 * World-space center of the box (the point the local→world rotation pivots
 * about for rendering). The CSS `transform: translate(x,y) rotate(r)` rotates
 * about the element's own center, so the local center maps to itself under the
 * world rotation and this is simply the local center.
 */
export function boxCenter(box: TransformBoxValue): Point {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Map a point given in the box's LOCAL (unrotated) frame to WORLD space, where
 * the box is rotated by `box.rotation` about its center. Used to find the
 * fixed-world position of an anchor corner before a resize.
 */
export function localToWorld(box: TransformBoxValue, local: Point): Point {
  return rotatePoint(local, box.rotation, boxCenter(box));
}

/** Inverse of {@link localToWorld}: a world point into the box's local frame. */
export function worldToLocal(box: TransformBoxValue, world: Point): Point {
  return rotatePoint(world, -box.rotation, boxCenter(box));
}

/**
 * Options controlling a single resize step. All optional; sensible defaults
 * keep an axis-aligned, anchor-the-opposite-edge resize.
 */
export interface ResizeEdgeOptions {
  /** Smallest allowed width. @default 1 */
  minWidth?: number;
  /** Smallest allowed height. @default 1 */
  minHeight?: number;
  /**
   * Lock the width/height ratio to this value (`width / height`). `null`
   * disables the lock. When set, the dominant dragged axis drives the other.
   * @default null
   */
  aspectRatio?: number | null;
  /**
   * Anchor symmetrically about the pivot instead of the opposite edge — the
   * box grows/shrinks equally on both sides (the Alt gesture). @default false
   */
  symmetric?: boolean;
  /**
   * Pivot used when `symmetric` is true (fractional point or `'center'`).
   * @default 'center'
   */
  pivot?: TransformBoxPivot;
  /**
   * Allow the box to flip through zero (negative size) instead of clamping at
   * the minimum. @default true
   */
  allowFlip?: boolean;
}

/**
 * Apply an aspect ratio to a width/height pair, keeping whichever axis the
 * handle primarily drives and deriving the other.
 *
 * - A corner (`axes.x !== 0 && axes.y !== 0`) uses the axis with the larger
 *   absolute size so the box tracks the dominant drag direction.
 * - A horizontal edge derives height from width; a vertical edge derives width
 *   from height.
 *
 * Signs are preserved (so a flipped, negative size stays negative). Pure.
 */
export function applyAspectRatio(
  width: number,
  height: number,
  ratio: number,
  axes: HandleAxes,
): { width: number; height: number } {
  if (!(ratio > 0) || !Number.isFinite(ratio)) return { width, height };

  const horizontal = axes.x !== 0;
  const vertical = axes.y !== 0;

  // Corner: pick the axis whose magnitude implies the larger box and derive the
  // other from it. This makes diagonal drags feel like they track the pointer.
  if (horizontal && vertical) {
    const wFromH = Math.abs(height) * ratio;
    if (Math.abs(width) >= wFromH) {
      const h = (Math.abs(width) / ratio) * Math.sign(height || 1);
      return { width, height: h };
    }
    const w = (Math.abs(height) * ratio) * Math.sign(width || 1);
    return { width: w, height };
  }

  // Horizontal edge: width is authoritative.
  if (horizontal) {
    return { width, height: (Math.abs(width) / ratio) * Math.sign(height || 1) };
  }
  // Vertical edge: height is authoritative.
  return { width: (Math.abs(height) * ratio) * Math.sign(width || 1), height };
}

/**
 * Clamp / normalize a box to satisfy the min-size and flip policy, returning a
 * box with NON-negative width/height (a flip is folded into the origin).
 *
 * - When `allowFlip` is false a size below its minimum is clamped to the
 *   minimum (the edge cannot cross its anchor).
 * - When `allowFlip` is true a negative size is allowed but normalized: the
 *   origin shifts and the size is made positive, so the committed box is always
 *   well-formed. The caller reads {@link TransformBoxValue} flip flags from the
 *   sign BEFORE normalization (see `resizeEdge`'s return).
 *
 * Pure.
 */
export function constrainRect(
  box: TransformBoxValue,
  minWidth = 1,
  minHeight = 1,
): TransformBoxValue {
  let { x, y, width, height } = box;

  if (width < 0) {
    x += width;
    width = -width;
  }
  if (height < 0) {
    y += height;
    height = -height;
  }
  if (width < minWidth) width = minWidth;
  if (height < minHeight) height = minHeight;

  return { x, y, width, height, rotation: box.rotation };
}

/** Result of a resize step, carrying the new box plus the flip flags it crossed. */
export interface ResizeResult {
  /** The resized box (already constrained / normalized). */
  box: TransformBoxValue;
  /** Whether the box is mirrored on x relative to the gesture start. */
  flippedX: boolean;
  /** Whether the box is mirrored on y relative to the gesture start. */
  flippedY: boolean;
}

/**
 * Resize `box` by moving the edge(s) a `handle` controls by `deltaLocal` — a
 * delta already expressed in the box's LOCAL (unrotated) axes.
 *
 * CRITICAL (rotated boxes): the caller MUST rotate the raw screen-space pointer
 * delta into local axes first (`rotateVector(screenDelta, -box.rotation)`)
 * before calling this. A naive axis-aligned delta is wrong once `rotation ≠ 0`
 * because the box's "width" axis no longer aligns with screen x.
 *
 * The opposite edge/corner stays fixed in WORLD space (or the pivot stays fixed
 * when `symmetric`). To keep the world anchor fixed we:
 *   1. record the anchor's world position from the original box,
 *   2. mutate the dragged edges in local space (so width/height/x/y change),
 *   3. re-place the box so the anchor's local position maps back to the same
 *      world point under the (unchanged) rotation.
 *
 * Aspect lock, min-size, and flip policy are applied between (2) and (3).
 * Returns the new box and the flip flags. Pure.
 */
export function resizeEdge(
  box: TransformBoxValue,
  handle: TransformBoxHandlePosition,
  deltaLocal: Point,
  options: ResizeEdgeOptions = {},
): ResizeResult {
  const {
    minWidth = 1,
    minHeight = 1,
    aspectRatio = null,
    symmetric = false,
    pivot = 'center',
    allowFlip = true,
  } = options;

  const axes = handleAxes(handle);

  // ── 1. world anchor ────────────────────────────────────────────────────────
  // The anchor is the opposite corner/edge midpoint that must stay put. For a
  // symmetric resize the anchor is the pivot itself. We capture it in world
  // space so rotation is accounted for.
  const startCenter = boxCenter(box);
  const anchorLocal = symmetric
    ? resolvePivot(box, pivot)
    : {
        // Opposite edge: flip the handle's outward sign. `0` axis → box center
        // coordinate (that edge is not being moved).
        x: box.x + (axes.x === 0 ? box.width / 2 : axes.x < 0 ? box.width : 0),
        y: box.y + (axes.y === 0 ? box.height / 2 : axes.y < 0 ? box.height : 0),
      };
  const anchorWorld = rotatePoint(anchorLocal, box.rotation, startCenter);

  // ── 2. apply the local delta to the dragged edges ──────────────────────────
  // Symmetric doubles the delta (both sides move). `axes.* === 0` → that axis is
  // untouched.
  const scale = symmetric ? 2 : 1;
  let newWidth = box.width + axes.x * deltaLocal.x * scale;
  let newHeight = box.height + axes.y * deltaLocal.y * scale;

  // ── 3. aspect lock ─────────────────────────────────────────────────────────
  if (aspectRatio !== null && aspectRatio !== undefined) {
    const applied = applyAspectRatio(newWidth, newHeight, aspectRatio, axes);
    newWidth = applied.width;
    newHeight = applied.height;
  }

  // Flip flags are read from the sign BEFORE we clamp/normalize. When flips are
  // disallowed the size is clamped to the minimum (never crosses zero), so the
  // box is never reported as flipped.
  const flippedX = allowFlip && axes.x !== 0 && newWidth < 0;
  const flippedY = allowFlip && axes.y !== 0 && newHeight < 0;

  // ── 4. min size / flip policy ──────────────────────────────────────────────
  if (!allowFlip) {
    if (newWidth < minWidth) newWidth = minWidth;
    if (newHeight < minHeight) newHeight = minHeight;
  }
  else {
    // Allow negative size but keep |size| above the minimum so a flipped box is
    // still grabbable.
    if (Math.abs(newWidth) < minWidth) newWidth = minWidth * Math.sign(newWidth || 1);
    if (Math.abs(newHeight) < minHeight) newHeight = minHeight * Math.sign(newHeight || 1);
  }

  // ── 5. re-place so the world anchor is preserved ───────────────────────────
  // Build a provisional box whose anchor sits at the SAME LOCAL position
  // (relative to the new size) as before, then translate it so that local
  // anchor maps back to `anchorWorld`.
  //
  // Local anchor fraction (0..1) is constant across the resize because the
  // anchor is the opposite edge/pivot. We compute the anchor's local position in
  // the resized box, rotate it about the resized center, and shift.
  const anchorFracX = symmetric
    ? pivotFrac(pivot, 'x')
    : axes.x === 0 ? 0.5 : axes.x < 0 ? 1 : 0;
  const anchorFracY = symmetric
    ? pivotFrac(pivot, 'y')
    : axes.y === 0 ? 0.5 : axes.y < 0 ? 1 : 0;

  // Provisional origin at (0,0); we only need it to compute the rotated offset of
  // the anchor from the center, which is translation-invariant.
  const provisional: TransformBoxValue = { x: 0, y: 0, width: newWidth, height: newHeight, rotation: box.rotation };
  const provCenter = boxCenter(provisional);
  const provAnchorLocal = { x: newWidth * anchorFracX, y: newHeight * anchorFracY };
  const provAnchorWorld = rotatePoint(provAnchorLocal, box.rotation, provCenter);

  // Shift the provisional box so its anchor lands on the recorded world anchor.
  const placed: TransformBoxValue = {
    x: anchorWorld.x - provAnchorWorld.x,
    y: anchorWorld.y - provAnchorWorld.y,
    width: newWidth,
    height: newHeight,
    rotation: box.rotation,
  };

  // Normalize negative sizes into a positive, well-formed box (flip folded into
  // the origin). When flips are disallowed sizes are already positive.
  const box2 = constrainRect(placed, minWidth, minHeight);

  return { box: box2, flippedX, flippedY };
}

/** Fractional anchor position for a pivot on one axis (0..1). */
function pivotFrac(pivot: TransformBoxPivot, axis: 'x' | 'y'): number {
  if (pivot === 'center') return 0.5;
  return axis === 'x' ? pivot.x : pivot.y;
}

/**
 * Move the box by a WORLD-space translation `delta`. Rotation does not change
 * the world-space translate, so this just shifts `x/y` (the box's local origin
 * lives in the same space its center renders in). Pure.
 */
export function moveBox(box: TransformBoxValue, delta: Point): TransformBoxValue {
  return { ...box, x: box.x + delta.x, y: box.y + delta.y };
}

/**
 * Compute a rotation (degrees) from a pointer at `point` about `pivotWorld`,
 * carrying a `start` reference so the seam (the ±180° wrap) is crossed smoothly:
 * the returned angle is `startRotation + signedDelta(startAngle → currentAngle)`.
 *
 * Convention matches the rest of the editor: 0° up, clockwise-positive.
 */
export function rotationFromPointer(
  point: Point,
  pivotWorld: Point,
  startPointerAngle: number,
  startRotation: number,
): number {
  const current = pointerAngle(point, pivotWorld);
  return startRotation + shortestAngleDelta(startPointerAngle, current);
}

/**
 * Raw angle (degrees) of `point` about `center`: 0° up, clockwise-positive,
 * range `[0, 360)`. Mirrors angle-dial's convention so rotation handles read the
 * same way. A point exactly at the center returns `0`.
 */
export function pointerAngle(point: Point, center: Point): number {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  if (dx === 0 && dy === 0) return 0;
  const rad = Math.atan2(dx, -dy);
  let deg = rad * (360 / TAU);
  if (deg < 0) deg += 360;
  return deg;
}

/**
 * Signed shortest step (degrees) from `from` to `to`, in `(-180, 180]`. Positive
 * is clockwise. Lets a rotate drag accumulate across the 0/360 seam instead of
 * snapping backwards.
 */
export function shortestAngleDelta(from: number, to: number): number {
  let d = (to - from) % 360;
  if (d > 180) d -= 360;
  else if (d <= -180) d += 360;
  return d;
}

/** Wrap an angle (degrees) into `[0, 360)`. */
export function normalizeRotation(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

/**
 * Snap a rotation to the nearest multiple of `increment` degrees. `increment <=
 * 0` returns the value unchanged. Anchored at 0. Pure.
 */
export function snapRotation(deg: number, increment: number): number {
  if (!(increment > 0)) return deg;
  return Math.round(deg / increment) * increment;
}

/**
 * Decompose a transform into its readable parts. Given a box, returns the
 * normalized box dimensions, the world-space center, the four corner points in
 * WORLD space (top-left, top-right, bottom-right, bottom-left, in that order,
 * rotation applied), and the normalized rotation in `[0, 360)`.
 *
 * Shared with Crop (which needs corner world positions to draw the crop overlay
 * and to hit-test handles) so the corner math lives in ONE pure place.
 */
export function decomposeTransform(box: TransformBoxValue): {
  /** Normalized box (positive width/height, flip folded into origin). */
  rect: { x: number; y: number; width: number; height: number };
  /** World-space center the box rotates about. */
  center: Point;
  /** Rotation folded into `[0, 360)`. */
  rotation: number;
  /** World-space corners: [top-left, top-right, bottom-right, bottom-left]. */
  corners: [Point, Point, Point, Point];
} {
  const norm = constrainRect(box, 0, 0);
  const center = { x: norm.x + norm.width / 2, y: norm.y + norm.height / 2 };
  const rotation = normalizeRotation(box.rotation);

  const tl = rotatePoint({ x: norm.x, y: norm.y }, box.rotation, center);
  const tr = rotatePoint({ x: norm.x + norm.width, y: norm.y }, box.rotation, center);
  const br = rotatePoint({ x: norm.x + norm.width, y: norm.y + norm.height }, box.rotation, center);
  const bl = rotatePoint({ x: norm.x, y: norm.y + norm.height }, box.rotation, center);

  return {
    rect: { x: norm.x, y: norm.y, width: norm.width, height: norm.height },
    center,
    rotation,
    corners: [tl, tr, br, bl],
  };
}
