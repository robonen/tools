export { default as ViewportRoot } from './ViewportRoot.vue';
export { default as ViewportSurface } from './ViewportSurface.vue';
export { default as ViewportContent } from './ViewportContent.vue';

export { provideViewportContext, useViewportContext } from './context';
export { useZoomPan } from './useZoomPan';
export type { UseZoomPanReturn } from './useZoomPan';
export { useViewportApi } from './useViewportApi';
export { useInteractionState } from './useInteractionState';

export {
  clamp,
  clampViewport,
  clampZoom,
  contentToScreen,
  fitViewTransform,
  measureContentRect,
  screenToContent,
  wheelToZoomFactor,
  zoomAtPointer,
} from './utils';

export type {
  Dimensions,
  FitParams,
  FitViewportOptions,
  Rect,
  SurfaceOrigin,
  SurfaceRect,
  TranslateExtent,
  Viewport,
  ViewportApi,
  ViewportConstraints,
  ViewportContext,
  ViewportRootProps,
  XYPosition,
  ZoomPanAxis,
  ZoomPanOptions,
} from './types';
