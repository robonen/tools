import type { QrCode } from '@robonen/encoding';
import { QrCodeDataType } from '@robonen/encoding';

/**
 * Geometry helpers for rendering a {@link QrCode} matrix to SVG paths.
 *
 * Every coordinate is expressed in *module units*: a module at grid index
 * `(x, y)` occupies the square `[x, x + 1] × [y, y + 1]`, so its center sits at
 * `(x + 0.5, y + 0.5)`. Multiplying by a scale factor (or letting the SVG
 * viewBox do it) yields pixels — the paths themselves are resolution-independent.
 */

/** Visual style applied to each data module ("pixel") of the code. */
export type QrCellPattern = 'square' | 'dot' | 'rounded' | 'fluid';

/** Shape of the outer 7×7 ring of a finder ("eye") pattern. */
export type QrMarkerFrame = 'square' | 'rounded' | 'circle';

/** Shape of the inner 3×3 ball of a finder ("eye") pattern. */
export type QrMarkerBall = 'square' | 'rounded' | 'circle' | 'diamond';

/** Which of the three finder patterns a {@link MarkerPlacement} refers to. */
export type MarkerCorner = 'top-left' | 'top-right' | 'bottom-left';

/** Position of a single finder pattern, given as the top-left module of its 7×7 region. */
export interface MarkerPlacement {
  corner: MarkerCorner;
  /** X index of the finder's top-left module. */
  x: number;
  /** Y index of the finder's top-left module. */
  y: number;
}

/** A rectangular region of the matrix, in module units, used to knock out modules behind overlays. */
export interface QrCodeRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Description of one dark module, passed to the `#cell` slot for custom rendering. */
export interface QrCellDescriptor {
  /** Column index. */
  x: number;
  /** Row index. */
  y: number;
  /** Center X (`x + 0.5`). */
  cx: number;
  /** Center Y (`y + 0.5`). */
  cy: number;
  /** Structural role of the module (data, timing, alignment, …). */
  type: QrCodeDataType;
}

/** Returns the top-left module index of each of the three finder patterns. */
export function markerPlacements(size: number): MarkerPlacement[] {
  return [
    { corner: 'top-left', x: 0, y: 0 },
    { corner: 'top-right', x: size - 7, y: 0 },
    { corner: 'bottom-left', x: 0, y: size - 7 },
  ];
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Rounds to 4 decimals and strips trailing zeros to keep generated path strings compact. */
function fmt(value: number): string {
  return String(Math.round(value * 1e4) / 1e4);
}

/**
 * Builds a rectangle path with an independent corner radius per corner. A radius
 * of `0` collapses that corner to a sharp right angle, which is how the `fluid`
 * pattern merges a module into its dark neighbours.
 */
export function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  rTL: number,
  rTR: number,
  rBR: number,
  rBL: number,
): string {
  const max = Math.min(w, h) / 2;
  rTL = clamp(rTL, 0, max);
  rTR = clamp(rTR, 0, max);
  rBR = clamp(rBR, 0, max);
  rBL = clamp(rBL, 0, max);

  let d = `M${fmt(x + rTL)} ${fmt(y)}`;
  d += `L${fmt(x + w - rTR)} ${fmt(y)}`;
  if (rTR > 0)
    d += `A${fmt(rTR)} ${fmt(rTR)} 0 0 1 ${fmt(x + w)} ${fmt(y + rTR)}`;
  d += `L${fmt(x + w)} ${fmt(y + h - rBR)}`;
  if (rBR > 0)
    d += `A${fmt(rBR)} ${fmt(rBR)} 0 0 1 ${fmt(x + w - rBR)} ${fmt(y + h)}`;
  d += `L${fmt(x + rBL)} ${fmt(y + h)}`;
  if (rBL > 0)
    d += `A${fmt(rBL)} ${fmt(rBL)} 0 0 1 ${fmt(x)} ${fmt(y + h - rBL)}`;
  d += `L${fmt(x)} ${fmt(y + rTL)}`;
  if (rTL > 0)
    d += `A${fmt(rTL)} ${fmt(rTL)} 0 0 1 ${fmt(x + rTL)} ${fmt(y)}`;
  return `${d}Z`;
}

/** Full circle (disc) path, drawn as two arcs. */
export function circlePath(cx: number, cy: number, r: number): string {
  return `M${fmt(cx - r)} ${fmt(cy)}`
    + `A${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(cx + r)} ${fmt(cy)}`
    + `A${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(cx - r)} ${fmt(cy)}Z`;
}

function diamondPath(cx: number, cy: number, r: number): string {
  return `M${fmt(cx)} ${fmt(cy - r)}L${fmt(cx + r)} ${fmt(cy)}`
    + `L${fmt(cx)} ${fmt(cy + r)}L${fmt(cx - r)} ${fmt(cy)}Z`;
}

/** Predicate deciding whether a module participates in cell rendering. */
type ModuleFilter = (x: number, y: number) => boolean;

interface CellOptions {
  pattern: QrCellPattern;
  /** Corner roundness in `[0, 1]` for `rounded`/`fluid` patterns. */
  radius: number;
  /** Inset applied to every module in `[0, 1)` to create gaps between cells. */
  gap: number;
  /** When `false`, modules belonging to a finder pattern are skipped (drawn by `QrCodeMarker`). */
  includeMarkers: boolean;
  /** Returns `true` for modules covered by an overlay (e.g. a logo) — they are skipped. */
  isReserved: ModuleFilter;
}

/** Whether a module should be drawn by `QrCodeCells` given the active options. */
function isCell(qr: QrCode, x: number, y: number, opts: CellOptions): boolean {
  if (x < 0 || y < 0 || x >= qr.size || y >= qr.size)
    return false;
  if (!qr.getModule(x, y))
    return false;
  if (!opts.includeMarkers && qr.getType(x, y) === QrCodeDataType.Position)
    return false;
  return !opts.isReserved(x, y);
}

function cellSnippet(qr: QrCode, x: number, y: number, opts: CellOptions): string {
  const { pattern } = opts;

  if (pattern === 'fluid') {
    // Connect to dark neighbours by squaring off the corners between them.
    const r = clamp(opts.radius, 0, 1) * 0.5;
    const top = isCell(qr, x, y - 1, opts);
    const bottom = isCell(qr, x, y + 1, opts);
    const left = isCell(qr, x - 1, y, opts);
    const right = isCell(qr, x + 1, y, opts);
    return roundedRectPath(
      x,
      y,
      1,
      1,
      !top && !left ? r : 0,
      !top && !right ? r : 0,
      !bottom && !right ? r : 0,
      !bottom && !left ? r : 0,
    );
  }

  const gap = clamp(opts.gap, 0, 0.95);
  const inset = gap / 2;
  const s = 1 - gap;

  if (pattern === 'dot')
    return circlePath(x + 0.5, y + 0.5, s / 2);

  const r = pattern === 'rounded' ? clamp(opts.radius, 0, 1) * (s / 2) : 0;
  return roundedRectPath(x + inset, y + inset, s, s, r, r, r, r);
}

/** Builds a single `<path>` `d` string covering every rendered data module. */
export function cellsPath(qr: QrCode, opts: CellOptions): string {
  const size = qr.size;
  let d = '';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (isCell(qr, x, y, opts))
        d += cellSnippet(qr, x, y, opts);
    }
  }
  return d;
}

/** Collects descriptors for every rendered data module, for slot-based custom rendering. */
export function cellList(
  qr: QrCode,
  opts: Pick<CellOptions, 'includeMarkers' | 'isReserved'>,
): QrCellDescriptor[] {
  const full: CellOptions = { ...opts, pattern: 'square', radius: 0, gap: 0 };
  const size = qr.size;
  const cells: QrCellDescriptor[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (isCell(qr, x, y, full))
        cells.push({ x, y, cx: x + 0.5, cy: y + 0.5, type: qr.getType(x, y) });
    }
  }
  return cells;
}

/**
 * Path for a finder pattern's outer ring. The frame occupies the 7×7 region
 * with a 1-module-thick border (`square`/`rounded`) or an annulus (`circle`),
 * leaving the standard 1-module light gap before the inner ball. Render with
 * `fill-rule="evenodd"` so the inner cut-out reads as a hole.
 */
export function markerFramePath(mx: number, my: number, shape: QrMarkerFrame, radius: number): string {
  const cx = mx + 3.5;
  const cy = my + 3.5;
  const t = clamp(radius, 0, 1);

  if (shape === 'circle')
    return circlePath(cx, cy, 3.5) + circlePath(cx, cy, 2.5);

  const ro = shape === 'rounded' ? t * 3.5 : 0;
  const ri = shape === 'rounded' ? Math.max(0, ro - 1) : 0;
  return roundedRectPath(mx, my, 7, 7, ro, ro, ro, ro)
    + roundedRectPath(mx + 1, my + 1, 5, 5, ri, ri, ri, ri);
}

/** Path for a finder pattern's inner 3×3 ball. */
export function markerBallPath(mx: number, my: number, shape: QrMarkerBall, radius: number): string {
  const cx = mx + 3.5;
  const cy = my + 3.5;

  if (shape === 'circle')
    return circlePath(cx, cy, 1.5);
  if (shape === 'diamond')
    return diamondPath(cx, cy, 1.5);

  const r = shape === 'rounded' ? clamp(radius, 0, 1) * 1.5 : 0;
  return roundedRectPath(mx + 2, my + 2, 3, 3, r, r, r, r);
}
