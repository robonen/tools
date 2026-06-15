import type { ComputedRef, Ref } from 'vue';
import type { PrimitiveProps } from '../../internal/primitive';
import type { Dimensions, Rect, Viewport, XYPosition } from '../flow/types';

// The four geometry primitives are reused verbatim from the flow module rather
// than redeclared: those names (`Viewport`, `Rect`, `XYPosition`,
// `Dimensions`) are already published from the package root barrel by flow, so
// re-declaring them here would make the barrel re-export the SAME name from two
// modules → TS2308 ("Module has already exported a member"). Re-exporting the
// identical symbol keeps one canonical type and one import surface.
export type { Dimensions, Rect, Viewport, XYPosition };

/** A surface origin: only `left`/`top` matter for coordinate conversion. */
export interface SurfaceOrigin {
  /** Distance from the viewport's left edge to the surface's left edge, in client px. */
  left: number;
  /** Distance from the viewport's top edge to the surface's top edge, in client px. */
  top: number;
}

/** The live bounding rect of the interaction surface in client (screen) px. */
export interface SurfaceRect {
  /** Surface left edge in client px. */
  left: number;
  /** Surface top edge in client px. */
  top: number;
  /** Surface width in client px. */
  width: number;
  /** Surface height in client px. */
  height: number;
}

/**
 * The axis interaction is constrained to.
 * - `'xy'`: free pan/zoom on both axes (the default).
 * - `'x'` / `'y'`: lock panning (and drag) to that single axis.
 */
export type ZoomPanAxis = 'xy' | 'x' | 'y';

/**
 * Optional per-axis translate clamp applied to the viewport `x`/`y` after every
 * write. When a side is `undefined` that side is unconstrained. When the allowed
 * interval is degenerate (`min > max`, i.e. the content is smaller than the
 * surface on that axis) the value is centred instead of pinned to a boundary.
 */
export interface TranslateExtent {
  /** Lower bound for viewport `x`. */
  minX?: number;
  /** Upper bound for viewport `x`. */
  maxX?: number;
  /** Lower bound for viewport `y`. */
  minY?: number;
  /** Upper bound for viewport `y`. */
  maxY?: number;
}

/** Constraints passed to {@link clampViewport}. */
export interface ViewportConstraints {
  /** Minimum zoom level. */
  minZoom: number;
  /** Maximum zoom level. */
  maxZoom: number;
  /** Optional per-axis translate clamp; `null` disables it. */
  translateExtent?: TranslateExtent | null;
}

/** Options for {@link fitViewTransform}. */
export interface FitViewportOptions {
  /** Fractional inset on each side, 0–1. @default 0.1 */
  padding?: number;
  /** Minimum zoom level. @default 0 */
  minZoom?: number;
  /** Maximum zoom level. @default Infinity */
  maxZoom?: number;
}

/** Parameters for the imperative {@link ViewportApi.fit}. */
export interface FitParams {
  /** Fractional inset on each side, 0–1. @default the root `fitPadding` */
  padding?: number;
  /** Override the min zoom of the fit. */
  minZoom?: number;
  /** Override the max zoom of the fit. */
  maxZoom?: number;
}

/**
 * Behaviour switches for {@link useZoomPan}. Mirrors the `ZoomPan*` props on
 * `ViewportRoot`; the root passes these through the context.
 */
export interface ZoomPanOptions {
  /** Axis interaction is constrained to. @default 'xy' */
  axis?: ZoomPanAxis;
  /** Drag the surface to pan. @default true */
  panOnDrag?: boolean;
  /** Wheel scroll zooms toward the pointer. @default true */
  zoomOnScroll?: boolean;
  /** Trackpad pinch (ctrl+wheel) zooms. @default true */
  zoomOnPinch?: boolean;
  /** Wheel scroll pans instead of zooms (pinch still zooms). @default false */
  panOnScroll?: boolean;
  /** Scroll-pan speed multiplier. @default 0.5 */
  panOnScrollSpeed?: number;
  /** Double-click zooms in toward the pointer. @default true */
  zoomOnDoubleClick?: boolean;
  /** Factor applied per double-click. @default 1.2 */
  doubleClickZoomFactor?: number;
  /**
   * Modifier key that must be held for scroll to zoom. When set, plain scroll is
   * ignored (or pans, if `panOnScroll`) and zoom requires the key. `null`
   * disables the gate. @default null
   */
  zoomActivationKey?: 'Alt' | 'Control' | 'Meta' | 'Shift' | null;
  /** Master interactivity switch (lock). @default false */
  disabled?: boolean;
  /** Disable the keyboard pan/zoom layer. @default false */
  disableKeyboard?: boolean;
  /** Pixel step for arrow-key panning. @default 20 */
  keyboardPanStep?: number;
}

/**
 * Imperative, framework-agnostic control surface for a zoom-pan viewport. Every
 * write goes through `clampViewport`, so the result always honours
 * `minZoom`/`maxZoom` and the translate extent.
 */
export interface ViewportApi {
  /** Current viewport `{x,y,zoom}`. */
  getViewport: () => Viewport;
  /** Replace the viewport (clamped). */
  setViewport: (viewport: Viewport) => void;
  /** Zoom in, anchored at the surface centre. */
  zoomIn: (factor?: number) => void;
  /** Zoom out, anchored at the surface centre. */
  zoomOut: (factor?: number) => void;
  /** Zoom to an absolute level, anchored at the surface centre. */
  zoomTo: (zoom: number) => void;
  /** Zoom to an absolute level, anchored at a surface-relative pixel point. */
  zoomToPoint: (zoom: number, point: XYPosition) => void;
  /**
   * Fit `bounds` (content space) into view, centred with padding. Defaults to
   * the root `contentExtent`; an explicit no-op when both are null. Respects the
   * surface `width === 0 || height === 0` early-return.
   */
  fit: (bounds?: Rect | null, params?: FitParams) => void;
  /** Centre a content-space point in the surface, keeping the current zoom. */
  center: (point?: XYPosition) => void;
  /** Pan by a screen-pixel delta. */
  panBy: (dx: number, dy: number) => void;
  /** Reset to `{ x: 0, y: 0, zoom: 1 }` (clamped). */
  reset: () => void;
  /** Convert a screen (client) point to content space. */
  screenToContent: (point: XYPosition) => XYPosition;
  /** Convert a content-space point to a screen (client) point. */
  contentToScreen: (point: XYPosition) => XYPosition;
}

/**
 * Root context shared by every zoom-pan part. Reactive fields are `Ref` (never
 * raw values — descendants would lose reactivity); the master `viewport` is
 * read and written directly, all writes funnelled through `clampViewport`.
 */
export interface ViewportContext {
  /** The master transform `{x,y,zoom}`. */
  viewport: Ref<Viewport>;
  /** Live bounding rect of `ViewportSurface`; the screen origin for coord math. */
  surfaceRect: Readonly<Ref<SurfaceRect>>;
  /** `ViewportSurface` reports its live bounding rect here (the screen origin). */
  setSurfaceRect: (rect: SurfaceRect) => void;

  /** Minimum zoom level. */
  minZoom: Ref<number>;
  /** Maximum zoom level. */
  maxZoom: Ref<number>;
  /** Axis interaction is constrained to. */
  axis: Ref<ZoomPanAxis>;
  /** Optional per-axis translate clamp; `null` disables it. */
  translateExtent: Ref<TranslateExtent | null>;
  /** Optional content bounds (content space) — the default `fit` target. */
  contentExtent: Ref<Rect | null>;
  /** Fractional fit padding, 0–1. */
  fitPadding: Ref<number>;

  /** Master interactivity switch (lock). */
  interactive: Ref<boolean>;
  /** False until the surface has reported its first non-zero rect. */
  measured: Ref<boolean>;
  /** ZoomPan behaviour switches, derived from the root props. */
  options: ComputedRef<ZoomPanOptions>;

  /** True while panning, zooming, or running an imperative API write. */
  isInteracting: Readonly<Ref<boolean>>;
  /** True while a drag-pan / scroll-pan gesture is active. */
  isPanning: Readonly<Ref<boolean>>;
  /** True while a wheel / pinch / dblclick zoom gesture is active. */
  isZooming: Readonly<Ref<boolean>>;

  /** Screen (client) point → content space, bound to the live viewport + surface. */
  screenToContent: (point: XYPosition) => XYPosition;
  /** Content space → screen (client) point. */
  contentToScreen: (point: XYPosition) => XYPosition;
  /** Measure a DOM element's rect back into content space (divide out zoom). */
  measureContentRect: (el: HTMLElement) => Rect;
  /** Clamp a candidate viewport against zoom + translate extent. */
  clampViewport: (viewport: Viewport) => Viewport;

  /** Imperative control surface. */
  api: ViewportApi;
}

/**
 * Props of `ViewportRoot`. Owns the `Viewport` state (controlled via
 * `v-model:viewport`, or uncontrolled via `defaultViewport`) and the
 * interaction configuration that flows into the context.
 */
export interface ViewportRootProps extends PrimitiveProps {
  /** Uncontrolled initial viewport (ignored when `v-model:viewport` is bound). @default { x: 0, y: 0, zoom: 1 } */
  defaultViewport?: Viewport;
  /** Minimum zoom level. @default 0.5 */
  minZoom?: number;
  /** Maximum zoom level. @default 2 */
  maxZoom?: number;
  /** Axis interaction is constrained to. @default 'xy' */
  axis?: ZoomPanAxis;
  /** Drag the surface to pan. @default true */
  panOnDrag?: boolean;
  /** Wheel scroll zooms toward the pointer. @default true */
  zoomOnScroll?: boolean;
  /** Trackpad pinch (ctrl+wheel) zooms. @default true */
  zoomOnPinch?: boolean;
  /** Wheel scroll pans instead of zooms (pinch still zooms). @default false */
  panOnScroll?: boolean;
  /** Double-click zooms in toward the pointer. @default true */
  zoomOnDoubleClick?: boolean;
  /** Optional per-axis translate clamp; `null` disables it. @default null */
  translateExtent?: TranslateExtent | null;
  /** Optional content bounds (content space) — the default `fit` target. @default null */
  contentExtent?: Rect | null;
  /** Fractional fit padding, 0–1. @default 0.1 */
  fitPadding?: number;
  /** Fit `contentExtent` into view on mount (once the surface is measured). @default false */
  fitView?: boolean;
  /** Modifier key that must be held for scroll to zoom; `null` disables the gate. @default null */
  zoomActivationKey?: 'Alt' | 'Control' | 'Meta' | 'Shift' | null;
  /** Master interactivity switch (lock). @default false */
  disabled?: boolean;
  /** Disable the keyboard pan/zoom layer. @default false */
  disableKeyboard?: boolean;
}
