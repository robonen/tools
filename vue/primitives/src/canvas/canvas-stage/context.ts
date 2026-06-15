import type { Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';
import type { Dimensions, Rect, Viewport, XYPosition } from '../zoom-pan';

/**
 * The imperative control surface of a {@link CanvasStageRoot}. Wraps the
 * underlying zoom-pan `ViewportApi` and adds the photo-editing fit modes
 * (`fitView` / `zoomToActual` / `fitFill`) that depend on the content size. Every
 * write funnels through the zoom-pan api's `clampViewport`, so the result always
 * honours `minZoom`/`maxZoom`.
 */
export interface CanvasStageApi {
  /** Current viewport `{x,y,zoom}`. */
  getViewport: () => Viewport;
  /** Replace the viewport (clamped). */
  setViewport: (viewport: Viewport) => void;
  /** Zoom in, anchored at the pane centre. */
  zoomIn: (factor?: number) => void;
  /** Zoom out, anchored at the pane centre. */
  zoomOut: (factor?: number) => void;
  /** Zoom to an absolute level, anchored at the pane centre. */
  zoomTo: (zoom: number) => void;
  /**
   * Fit the whole content into the pane, centred with `fitPadding`. The
   * "contain" mode — the entire image/video is visible. No-op until both the
   * pane and the content have been measured.
   */
  fitView: () => void;
  /**
   * Zoom to 1:1 (zoom 1, one content px per screen px), centred on the content
   * centre. No-op until the pane has been measured.
   */
  zoomToActual: () => void;
  /**
   * Scale the content to *cover* the pane (the larger of the two fit ratios),
   * centred — the "fill" mode, no letterboxing. No-op until measured.
   */
  fitFill: () => void;
  /** Centre a content-space point in the pane, keeping the current zoom. */
  center: (point?: XYPosition) => void;
  /** Reset to `{ x: 0, y: 0, zoom: 1 }` (clamped). */
  reset: () => void;
}

/**
 * Context shared by every `CanvasStage` part. Exposes the wrapped
 * {@link CanvasStageApi}, the reactive content size, and the resolved content
 * extent (a content-space {@link Rect} starting at the origin), plus the surface
 * measurement flag so descendants can gate behaviour until the pane is ready.
 */
export interface CanvasStageContext {
  /** The combined imperative api (zoom-pan + canvas fit modes). */
  api: CanvasStageApi;
  /** Live viewport `{x,y,zoom}` (read-only mirror of the zoom-pan master). */
  viewport: Ref<Viewport>;
  /**
   * The intrinsic content size in content-space px — either the explicit
   * `contentWidth`/`contentHeight` props or the measured size of the content
   * element. `{ width: 0, height: 0 }` until known.
   */
  contentSize: Ref<Dimensions>;
  /** The content extent `{ x: 0, y: 0, width, height }` used by the fit modes. */
  contentExtent: Ref<Rect>;
  /** False until the pane has reported its first non-zero rect. */
  measured: Ref<boolean>;
  /** Whether the content element should be auto-measured (no explicit size props). */
  autoMeasure: Ref<boolean>;
  /** `CanvasStageContent` reports its measured intrinsic size here. */
  setMeasuredContentSize: (size: Dimensions) => void;
}

const context = useContextFactory<CanvasStageContext>('CanvasStageContext');

/** Provide the {@link CanvasStageContext} to descendants of `CanvasStageRoot`. */
export const provideCanvasStageContext = context.provide;

/** Inject the {@link CanvasStageContext}. Throws when no `CanvasStageRoot` ancestor. */
export const useCanvasStageContext = context.inject;
