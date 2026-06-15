import { clamp } from '@robonen/stdlib';
import type {
  Dimensions,
  FitViewportOptions,
  Rect,
  SurfaceOrigin,
  Viewport,
  ViewportConstraints,
  XYPosition,
} from './types';

/** Re-exported so zoom-pan code has one import surface for clamping. */
export { clamp };

/**
 * Convert a screen (client) point to content space.
 *
 * Inverse of {@link contentToScreen}. The client point must have the surface's
 * `left`/`top` subtracted first, then the viewport translation removed and the
 * zoom divided out. On the pointer hot path — no allocations beyond the result.
 *
 * @param point Client (screen) point.
 * @param vp Current viewport transform.
 * @param surfaceRect Surface origin (`left`/`top`).
 * @returns The point in content space.
 */
export function screenToContent(point: XYPosition, vp: Viewport, surfaceRect: SurfaceOrigin): XYPosition {
  return {
    x: (point.x - surfaceRect.left - vp.x) / vp.zoom,
    y: (point.y - surfaceRect.top - vp.y) / vp.zoom,
  };
}

/**
 * Convert a content-space point to a screen (client) point. Inverse of
 * {@link screenToContent}.
 *
 * @param point Content-space point.
 * @param vp Current viewport transform.
 * @param surfaceRect Surface origin (`left`/`top`).
 * @returns The point in client (screen) space.
 */
export function contentToScreen(point: XYPosition, vp: Viewport, surfaceRect: SurfaceOrigin): XYPosition {
  return {
    x: point.x * vp.zoom + vp.x + surfaceRect.left,
    y: point.y * vp.zoom + vp.y + surfaceRect.top,
  };
}

/**
 * New viewport that keeps the content point under `pointer` (surface-relative
 * pixels) fixed on screen while the zoom changes to `nextZoom`. Caller is
 * expected to clamp `nextZoom` first via {@link clampZoom}.
 *
 * @param vp Current viewport.
 * @param nextZoom Target zoom level (already clamped).
 * @param pointer Surface-relative pixel point to keep anchored.
 * @param surfaceRect Surface origin (`left`/`top`); when `pointer` is already
 *   surface-relative pass `{ left: 0, top: 0 }`.
 * @returns The anchored viewport.
 */
export function zoomAtPointer(
  vp: Viewport,
  nextZoom: number,
  pointer: XYPosition,
  surfaceRect: SurfaceOrigin = { left: 0, top: 0 },
): Viewport {
  // Pointer in surface-local pixels (the math assumes the surface origin is 0,0).
  const px = pointer.x - surfaceRect.left;
  const py = pointer.y - surfaceRect.top;
  const ratio = nextZoom / vp.zoom;
  return {
    zoom: nextZoom,
    x: px - (px - vp.x) * ratio,
    y: py - (py - vp.y) * ratio,
  };
}

/**
 * Multiplicative zoom factor for a wheel event, normalising the three
 * `deltaMode` units and amplifying trackpad pinch (`ctrlKey`). Multiply the
 * current zoom by the result.
 *
 * @param event The wheel event.
 * @returns The factor to multiply the current zoom by.
 */
export function wheelToZoomFactor(event: WheelEvent): number {
  const unit = event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002;
  const delta = -event.deltaY * unit * (event.ctrlKey ? 10 : 1);
  return 2 ** delta;
}

/**
 * Clamp a zoom level to `[min, max]`.
 *
 * @param zoom Candidate zoom.
 * @param min Minimum zoom.
 * @param max Maximum zoom.
 * @returns The clamped zoom.
 */
export function clampZoom(zoom: number, min: number, max: number): number {
  return clamp(zoom, min, max);
}

/**
 * Clamp one axis of the viewport translation to `[min, max]`. When the interval
 * is degenerate (`min > max` — the content is smaller than the surface on this
 * axis, so there is no room to pan) the value is CENTRED at `(min + max) / 2`
 * instead of pinned to a boundary, which would otherwise make the content
 * oscillate against the edge.
 */
function clampTranslateAxis(value: number, min: number | undefined, max: number | undefined): number {
  if (min === undefined && max === undefined) return value;
  if (min !== undefined && max !== undefined) {
    if (min > max) return (min + max) / 2;
    return clamp(value, min, max);
  }
  if (min !== undefined) return Math.max(value, min);
  return Math.min(value, max!);
}

/**
 * Clamp a candidate viewport: first the zoom to `[minZoom, maxZoom]`, then —
 * when a `translateExtent` is supplied — each translate axis. See
 * {@link clampTranslateAxis} for the degenerate-interval centring rule.
 *
 * @param vp Candidate viewport.
 * @param constraints Zoom bounds and optional translate extent.
 * @returns The clamped viewport (a new object; never mutates `vp`).
 */
export function clampViewport(vp: Viewport, constraints: ViewportConstraints): Viewport {
  const zoom = clampZoom(vp.zoom, constraints.minZoom, constraints.maxZoom);
  const extent = constraints.translateExtent;
  if (!extent) return { zoom, x: vp.x, y: vp.y };
  return {
    zoom,
    x: clampTranslateAxis(vp.x, extent.minX, extent.maxX),
    y: clampTranslateAxis(vp.y, extent.minY, extent.maxY),
  };
}

/**
 * Viewport that fits `contentBounds` inside a `surface` of the given size,
 * centred, with `padding`. Zoom is clamped to `[minZoom, maxZoom]`. No-ops
 * (returns an identity-ish viewport) when the surface or the bounds is
 * zero-sized — there is nothing meaningful to fit.
 *
 * @param contentBounds Bounds to fit, in content space.
 * @param surface Surface size in client px.
 * @param opts Padding and zoom clamp.
 * @returns The fitting viewport.
 */
export function fitViewTransform(
  contentBounds: Rect,
  surface: Dimensions,
  opts: FitViewportOptions = {},
): Viewport {
  const padding = opts.padding ?? 0.1;
  const minZoom = opts.minZoom ?? 0;
  const maxZoom = opts.maxZoom ?? Infinity;
  const { width: cw, height: ch } = surface;

  // Early no-op: a zero-sized surface or zero-sized bounds has no fit.
  if (cw === 0 || ch === 0 || contentBounds.width === 0 || contentBounds.height === 0)
    return { x: 0, y: 0, zoom: clamp(1, minZoom, maxZoom) };

  const bw = contentBounds.width;
  const bh = contentBounds.height;

  const zoom = clamp(Math.min(cw / bw, ch / bh) * (1 - padding), minZoom, maxZoom);
  const centerX = contentBounds.x + contentBounds.width / 2;
  const centerY = contentBounds.y + contentBounds.height / 2;

  return {
    zoom,
    x: cw / 2 - centerX * zoom,
    y: ch / 2 - centerY * zoom,
  };
}

/**
 * Measure a DOM element's rect back into content space.
 *
 * `getBoundingClientRect()` returns the element's *rendered* (post-`scale`)
 * geometry; to recover the underlying content-space rect each dimension is
 * divided by the current `zoom`, and the position is converted through
 * {@link screenToContent} (this is the `getHandleBoundsFromDom` gotcha from
 * flow — a measured rect is in screen px and must have the zoom divided out
 * before it can be reasoned about in content space). Called once per
 * measurement, never per frame.
 *
 * @param el The element to measure.
 * @param vp Current viewport.
 * @param surfaceRect Surface origin (`left`/`top`).
 * @returns The element's rect in content space.
 */
export function measureContentRect(el: HTMLElement, vp: Viewport, surfaceRect: SurfaceOrigin): Rect {
  const rect = el.getBoundingClientRect();
  const topLeft = screenToContent({ x: rect.left, y: rect.top }, vp, surfaceRect);
  return {
    x: topLeft.x,
    y: topLeft.y,
    width: rect.width / vp.zoom,
    height: rect.height / vp.zoom,
  };
}
