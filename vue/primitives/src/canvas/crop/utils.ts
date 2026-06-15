import type { Point } from '../../internal/utils/geometry';

/**
 * An axis-aligned crop rectangle. Lives in whatever coordinate space the
 * consumer chose via the `units` prop on `CropRoot`:
 * - `'normalized'` (default): `x`/`y`/`width`/`height` are fractions `0..1` of
 *   the media, so the rect is resolution-independent.
 * - `'pixels'`: the same fields are media-space pixels.
 *
 * The pure helpers in this module operate in a single, consistent space — the
 * caller picks one and stays in it. They never mix units.
 */
export interface CropRect {
  /** Left edge. */
  x: number;
  /** Top edge. */
  y: number;
  /** Rectangle width (always `>= 0`). */
  width: number;
  /** Rectangle height (always `>= 0`). */
  height: number;
}

/**
 * The eight resize handles of a crop rectangle: four corners and four edge
 * midpoints. Corner handles move two edges, edge handles move one.
 */
export type CropHandlePosition
  = | 'top-left'
    | 'top'
    | 'top-right'
    | 'right'
    | 'bottom-right'
    | 'bottom'
    | 'bottom-left'
    | 'left';

/** The media bounds the crop is clamped against, in the rect's own units. */
export interface CropBounds {
  /** Media width (`1` in normalized units, media pixels otherwise). */
  width: number;
  /** Media height (`1` in normalized units, media pixels otherwise). */
  height: number;
}

/** All eight handle positions in a stable, clockwise-from-top-left order. */
export const CROP_HANDLE_POSITIONS: readonly CropHandlePosition[] = [
  'top-left',
  'top',
  'top-right',
  'right',
  'bottom-right',
  'bottom',
  'bottom-left',
  'left',
] as const;

/** Whether a handle moves the top edge. */
function movesTop(h: CropHandlePosition): boolean {
  return h === 'top-left' || h === 'top' || h === 'top-right';
}
/** Whether a handle moves the bottom edge. */
function movesBottom(h: CropHandlePosition): boolean {
  return h === 'bottom-left' || h === 'bottom' || h === 'bottom-right';
}
/** Whether a handle moves the left edge. */
function movesLeft(h: CropHandlePosition): boolean {
  return h === 'top-left' || h === 'left' || h === 'bottom-left';
}
/** Whether a handle moves the right edge. */
function movesRight(h: CropHandlePosition): boolean {
  return h === 'top-right' || h === 'right' || h === 'bottom-right';
}

/** Clamp `n` into `[lo, hi]`. (Local copy — keeps `utils.ts` dependency-free.) */
function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}

/**
 * The smallest box (in the rect's units) that satisfies BOTH `minWidth`/
 * `minHeight` AND, when `aspectRatio` is set, the ratio. The binding constraint
 * is whichever forces the larger box — so a tall ratio grows the width to keep
 * the height-min legal, and vice versa. The crop must never shrink past this.
 *
 * @param minWidth Minimum width in the rect's units (`>= 0`).
 * @param minHeight Minimum height in the rect's units (`>= 0`).
 * @param aspectRatio Locked `width / height`, or `null` for free resize.
 */
export function minBox(
  minWidth: number,
  minHeight: number,
  aspectRatio: number | null,
): { width: number; height: number } {
  const mw = Math.max(0, minWidth);
  const mh = Math.max(0, minHeight);
  if (aspectRatio === null || !(aspectRatio > 0) || !Number.isFinite(aspectRatio))
    return { width: mw, height: mh };
  // Grow whichever dimension is too small to honour the ratio about the other.
  // width = ratio * height. Pick the larger of (mw, ratio*mh) for the width, then
  // derive the matching height so both minimums are met.
  const widthFromHeight = aspectRatio * mh;
  const width = Math.max(mw, widthFromHeight);
  const height = width / aspectRatio;
  return { width, height };
}

/**
 * Re-fit an existing rect to `aspectRatio` about its centre (used when the
 * ratio is set/changed on a free rect), then clamp the result into `bounds`.
 * The area is preserved as closely as possible: the new box is the
 * ratio-correct rect whose area matches the old one, centred on the old centre.
 *
 * @param rect The current (free) rectangle.
 * @param aspectRatio Target `width / height` (`> 0`).
 * @param bounds Media bounds to clamp into.
 * @param minWidth Minimum width in units.
 * @param minHeight Minimum height in units.
 */
export function fitRectToRatio(
  rect: CropRect,
  aspectRatio: number,
  bounds: CropBounds,
  minWidth: number,
  minHeight: number,
): CropRect {
  if (!(aspectRatio > 0) || !Number.isFinite(aspectRatio)) return rect;
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const area = Math.max(rect.width * rect.height, 1e-9);
  // w * h = area, w / h = ratio  →  h = sqrt(area / ratio), w = ratio * h.
  let height = Math.sqrt(area / aspectRatio);
  let width = aspectRatio * height;
  // Never below the combined min box.
  const min = minBox(minWidth, minHeight, aspectRatio);
  if (width < min.width) {
    width = min.width;
    height = min.height;
  }
  // Never exceed the media in either dimension while holding the ratio.
  const maxW = bounds.width;
  const maxH = bounds.height;
  if (width > maxW) {
    width = maxW;
    height = width / aspectRatio;
  }
  if (height > maxH) {
    height = maxH;
    width = height * aspectRatio;
  }
  const x = clamp(cx - width / 2, 0, Math.max(0, bounds.width - width));
  const y = clamp(cy - height / 2, 0, Math.max(0, bounds.height - height));
  return { x, y, width, height };
}

/**
 * Translate (move) `rect` by `dx`/`dy`, optionally clamped so it stays fully
 * inside `bounds`. Size is never changed — only the origin.
 *
 * @param rect The rectangle to move.
 * @param dx Delta on x in the rect's units.
 * @param dy Delta on y in the rect's units.
 * @param bounds Media bounds.
 * @param constrain When `true`, the rect is kept within `bounds`.
 */
export function moveRect(
  rect: CropRect,
  dx: number,
  dy: number,
  bounds: CropBounds,
  constrain: boolean,
): CropRect {
  let x = rect.x + dx;
  let y = rect.y + dy;
  if (constrain) {
    x = clamp(x, 0, Math.max(0, bounds.width - rect.width));
    y = clamp(y, 0, Math.max(0, bounds.height - rect.height));
  }
  return { x, y, width: rect.width, height: rect.height };
}

/**
 * Resize `rect` by dragging `handle` to a new pointer position, with the
 * opposite edge(s) held fixed. Honours `aspectRatio` (paired-dimension
 * adjustment), the combined `minBox`, and — when `constrain` is set — the media
 * bounds (clamping the limiting dimension while preserving the ratio).
 *
 * The whole computation runs in the rect's units. `px`/`py` are the desired new
 * position of the dragged handle (the anchor edge stays put). This is the core
 * of every corner/edge drag and of keyboard edge-resize (with a synthetic
 * target one step away).
 *
 * @param rect The rectangle being resized.
 * @param handle Which handle is being dragged.
 * @param px Desired new x of the dragged handle, in units.
 * @param py Desired new y of the dragged handle, in units.
 * @param options Aspect, mins, bounds and the constrain flag.
 */
export function resizeRect(
  rect: CropRect,
  handle: CropHandlePosition,
  px: number,
  py: number,
  options: {
    aspectRatio: number | null;
    minWidth: number;
    minHeight: number;
    bounds: CropBounds;
    constrain: boolean;
  },
): CropRect {
  const { aspectRatio, minWidth, minHeight, bounds, constrain } = options;
  const ratio = aspectRatio !== null && aspectRatio > 0 && Number.isFinite(aspectRatio)
    ? aspectRatio
    : null;
  const min = minBox(minWidth, minHeight, ratio);

  // Fixed (anchor) edges — the opposite edge of whatever the handle moves.
  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;

  const ml = movesLeft(handle);
  const mr = movesRight(handle);
  const mt = movesTop(handle);
  const mb = movesBottom(handle);

  // 1) Free resize: move the active edges to the pointer, clamp each so the box
  //    keeps a non-negative size at least `min` and (when constrain) stays in
  //    bounds. Anchor edges are the opposite, untouched edges.
  let newLeft = left;
  let newRight = right;
  let newTop = top;
  let newBottom = bottom;

  if (ml) newLeft = constrain ? clamp(px, 0, right - min.width) : Math.min(px, right - min.width);
  if (mr) newRight = constrain ? clamp(px, left + min.width, bounds.width) : Math.max(px, left + min.width);
  if (mt) newTop = constrain ? clamp(py, 0, bottom - min.height) : Math.min(py, bottom - min.height);
  if (mb) newBottom = constrain ? clamp(py, top + min.height, bounds.height) : Math.max(py, top + min.height);

  let width = newRight - newLeft;
  let height = newBottom - newTop;

  if (ratio !== null) {
    // 2) Aspect-locked: the dragged edge(s) drive the PRIMARY dimension; the
    //    paired dimension is derived and grown about the appropriate anchor.
    const isCorner = (ml || mr) && (mt || mb);
    if (isCorner) {
      // Corner: let width lead, derive height (pick the larger so the pointer
      // is always "inside" the box — feels natural on a corner drag).
      const hFromW = width / ratio;
      if (hFromW >= height) {
        height = hFromW;
      }
      else {
        width = height * ratio;
      }
    }
    else if (ml || mr) {
      // Horizontal edge handle: width leads, height follows about the centre.
      height = width / ratio;
    }
    else {
      // Vertical edge handle: height leads, width follows about the centre.
      width = height * ratio;
    }

    // Never below the combined min.
    if (width < min.width) {
      width = min.width;
      height = min.height;
    }

    // 3) Constrain + ratio: if the derived box would exit the media, clamp the
    //    LIMITING dimension and re-derive the other to preserve the ratio.
    if (constrain) {
      // Determine the anchor corner the box grows from.
      const anchorX = ml ? right : left; // fixed x edge
      const anchorY = mt ? bottom : top; // fixed y edge
      // Max width/height available from the anchor toward the drag direction.
      const availW = ml ? anchorX : bounds.width - anchorX;
      const availH = mt ? anchorY : bounds.height - anchorY;
      if (width > availW) {
        width = availW;
        height = width / ratio;
      }
      if (height > availH) {
        height = availH;
        width = height * ratio;
      }
      // Re-apply the min after clamping (clamp may have pushed below min when
      // the media is smaller than the min box — min wins, bounds are honoured
      // by the final position clamp).
      if (width < min.width) {
        width = min.width;
        height = min.height;
      }
    }

    // Recompute the moving edges from the fixed anchors + the (possibly
    // ratio-adjusted) dimensions. For a centre-anchored edge handle the paired
    // dimension grows symmetrically about the box centre.
    if (ml) newLeft = right - width;
    else if (mr) newRight = left + width;
    else {
      // vertical-only handle: centre the width about the existing centre x.
      const cx = (left + right) / 2;
      newLeft = cx - width / 2;
      newRight = cx + width / 2;
    }
    if (mt) newTop = bottom - height;
    else if (mb) newBottom = top + height;
    else {
      // horizontal-only handle: centre the height about the existing centre y.
      const cy = (top + bottom) / 2;
      newTop = cy - height / 2;
      newBottom = cy + height / 2;
    }
  }

  let outX = newLeft;
  let outY = newTop;
  let outW = newRight - newLeft;
  let outH = newBottom - newTop;

  // Final safety clamp: keep the box inside the media when constrained. Shift
  // (not shrink) so the ratio/size survive; only shrink if the box is wider/
  // taller than the media itself.
  if (constrain) {
    if (outW > bounds.width) outW = bounds.width;
    if (outH > bounds.height) outH = bounds.height;
    outX = clamp(outX, 0, Math.max(0, bounds.width - outW));
    outY = clamp(outY, 0, Math.max(0, bounds.height - outH));
  }

  return { x: outX, y: outY, width: outW, height: outH };
}

/**
 * Build a fresh rect from a draw-from-empty create gesture: the press `origin`
 * and the current pointer `point` define opposite corners. Normalised so width
 * and height are non-negative, then aspect-fitted (anchored at `origin`) and
 * clamped into bounds. Used by the `createOnEmpty` path.
 *
 * @param origin The pointerdown corner, in units.
 * @param point The current pointer corner, in units.
 * @param options Aspect, mins, bounds and the constrain flag.
 */
export function createRect(
  origin: Point,
  point: Point,
  options: {
    aspectRatio: number | null;
    minWidth: number;
    minHeight: number;
    bounds: CropBounds;
    constrain: boolean;
  },
): CropRect {
  // Which handle the pointer is dragging is decided by the sign of the drag, so
  // we drive `resizeRect` from a zero-area rect anchored at `origin` and let it
  // do all the ratio/bounds/min work.
  const dirX = point.x >= origin.x ? 'right' : 'left';
  const dirY = point.y >= origin.y ? 'bottom' : 'top';
  const handle = `${dirY === 'bottom' ? 'bottom' : 'top'}-${dirX === 'right' ? 'right' : 'left'}` as CropHandlePosition;
  const seed: CropRect = { x: origin.x, y: origin.y, width: 0, height: 0 };
  return resizeRect(seed, handle, point.x, point.y, options);
}

/**
 * Clamp/normalise an arbitrary rect into a legal crop: non-negative size, at
 * least the combined `minBox`, optionally ratio-fitted, and (when `constrain`)
 * within `bounds`. Used to sanitise an incoming `modelValue` and to settle a
 * rect after a units / aspectRatio / bounds change.
 *
 * @param rect The candidate rectangle.
 * @param options Aspect, mins, bounds and the constrain flag.
 */
export function normalizeRect(
  rect: CropRect,
  options: {
    aspectRatio: number | null;
    minWidth: number;
    minHeight: number;
    bounds: CropBounds;
    constrain: boolean;
  },
): CropRect {
  const { aspectRatio, minWidth, minHeight, bounds, constrain } = options;
  const ratio = aspectRatio !== null && aspectRatio > 0 && Number.isFinite(aspectRatio)
    ? aspectRatio
    : null;
  let width = Math.max(0, rect.width);
  let height = Math.max(0, rect.height);
  let x = rect.x;
  let y = rect.y;

  if (ratio !== null) {
    const fitted = fitRectToRatio({ x, y, width, height }, ratio, bounds, minWidth, minHeight);
    return fitted;
  }

  const min = minBox(minWidth, minHeight, ratio);
  if (width < min.width) width = min.width;
  if (height < min.height) height = min.height;

  if (constrain) {
    if (width > bounds.width) width = bounds.width;
    if (height > bounds.height) height = bounds.height;
    x = clamp(x, 0, Math.max(0, bounds.width - width));
    y = clamp(y, 0, Math.max(0, bounds.height - height));
  }
  return { x, y, width, height };
}

/**
 * Convert between coordinate spaces for an aspect-ratio supplied in display
 * (pixel) terms. The `aspectRatio` prop is unit-agnostic (`width / height` of
 * the *crop box*), so in normalized space it must be divided by the media's own
 * pixel aspect to stay visually correct. Returns the ratio expressed in the
 * rect's units.
 *
 * @param aspectRatio The visual `width / height` the consumer asked for.
 * @param units The active coordinate space.
 * @param mediaWidth Media width in pixels (for the normalized correction).
 * @param mediaHeight Media height in pixels.
 */
export function resolveAspectRatio(
  aspectRatio: number | null,
  units: 'normalized' | 'pixels',
  mediaWidth: number,
  mediaHeight: number,
): number | null {
  if (aspectRatio === null || !(aspectRatio > 0) || !Number.isFinite(aspectRatio)) return null;
  if (units === 'pixels') return aspectRatio;
  // Normalized: a visual ratio of R means width_px/height_px = R, i.e.
  // (wx*mediaW)/(hy*mediaH) = R  →  wx/hy = R * mediaH / mediaW.
  if (mediaWidth <= 0 || mediaHeight <= 0) return aspectRatio;
  return aspectRatio * (mediaHeight / mediaWidth);
}
