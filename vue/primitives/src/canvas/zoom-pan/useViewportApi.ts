import type { FitParams, Rect, Viewport, ViewportApi, ViewportContext, XYPosition } from './types';
import { clampZoom, fitViewTransform, zoomAtPointer } from './utils';

/**
 * Builds the imperative {@link ViewportApi} over a {@link ViewportContext}.
 *
 * Every write funnels through `ctx.clampViewport`, so the resulting viewport
 * always honours `minZoom`/`maxZoom` and the translate extent regardless of the
 * entry point. Zoom helpers anchor at the surface centre (the imperative analogue
 * of zoom-at-pointer). `fit`/`center` honour the surface `width === 0` /
 * `height === 0` early-return — a not-yet-measured surface has no meaningful
 * centre and a `0 / 0` zoom would be `NaN`.
 *
 * @param ctx The viewport context.
 * @returns The imperative control surface.
 */
export function useViewportApi(ctx: ViewportContext): ViewportApi {
  /** Surface centre in surface-local pixels. */
  function center(): XYPosition {
    const rect = ctx.surfaceRect.value;
    return { x: rect.width / 2, y: rect.height / 2 };
  }

  function write(vp: Viewport): void {
    ctx.viewport.value = ctx.clampViewport(vp);
  }

  function zoomToLevel(zoom: number, anchor: XYPosition): void {
    const vp = ctx.viewport.value;
    const next = clampZoom(zoom, ctx.minZoom.value, ctx.maxZoom.value);
    write(zoomAtPointer(vp, next, anchor));
  }

  function zoomBy(factor: number): void {
    zoomToLevel(ctx.viewport.value.zoom * factor, center());
  }

  return {
    getViewport: () => ctx.viewport.value,
    setViewport: vp => write(vp),
    zoomIn: (factor = 1.2) => zoomBy(factor),
    zoomOut: (factor = 1.2) => zoomBy(1 / factor),
    zoomTo: zoom => zoomToLevel(zoom, center()),
    zoomToPoint: (zoom, point) => zoomToLevel(zoom, point),
    fit: (bounds?: Rect | null, params: FitParams = {}) => {
      const target = bounds ?? ctx.contentExtent.value;
      // Explicit no-op when there is nothing to fit (no argument and no extent).
      if (!target) return;
      const rect = ctx.surfaceRect.value;
      if (rect.width === 0 || rect.height === 0) return;
      write(fitViewTransform(target, { width: rect.width, height: rect.height }, {
        padding: params.padding ?? ctx.fitPadding.value,
        minZoom: params.minZoom ?? ctx.minZoom.value,
        maxZoom: params.maxZoom ?? ctx.maxZoom.value,
      }));
    },
    center: (point?: XYPosition) => {
      const rect = ctx.surfaceRect.value;
      if (rect.width === 0 || rect.height === 0) return;
      const vp = ctx.viewport.value;
      // Default target: the content point currently under the surface centre, so
      // a no-arg `center()` is a stable identity (re-centres on itself).
      const target = point ?? {
        x: (rect.width / 2 - vp.x) / vp.zoom,
        y: (rect.height / 2 - vp.y) / vp.zoom,
      };
      write({
        zoom: vp.zoom,
        x: rect.width / 2 - target.x * vp.zoom,
        y: rect.height / 2 - target.y * vp.zoom,
      });
    },
    panBy: (dx, dy) => {
      const vp = ctx.viewport.value;
      write({ zoom: vp.zoom, x: vp.x + dx, y: vp.y + dy });
    },
    reset: () => write({ x: 0, y: 0, zoom: 1 }),
    screenToContent: point => ctx.screenToContent(point),
    contentToScreen: point => ctx.contentToScreen(point),
  };
}
