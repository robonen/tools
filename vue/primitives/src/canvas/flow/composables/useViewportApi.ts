import type { FlowContext } from '../context';
import type { FlowEdge, InternalNode, Viewport, XYPosition } from '../types';
import { clampZoom, fitViewTransform, getNodesBounds, zoomAtPointer } from '../utils';

export interface FitViewParams {
  /** Fractional inset on each side, 0–1. @default 0.1 */
  padding?: number;
  /** Restrict the fit to these node ids. */
  nodes?: string[];
}

/** Imperative, framework-agnostic control surface for the flow. */
export interface FlowApi {
  /** Current viewport `{x,y,zoom}`. */
  getViewport: () => Viewport;
  /** Replace the viewport. */
  setViewport: (viewport: Viewport) => void;
  /** Zoom in toward the pane centre. */
  zoomIn: (factor?: number) => void;
  /** Zoom out from the pane centre. */
  zoomOut: (factor?: number) => void;
  /** Zoom to an absolute level, anchored at the pane centre. */
  zoomTo: (zoom: number) => void;
  /** Fit all (or the given) nodes into view. */
  fitView: (params?: FitViewParams) => void;
  /** Convert a screen (client) point to flow space. */
  screenToFlowPosition: (point: XYPosition) => XYPosition;
  /** Convert a flow-space point to a screen (client) point. */
  flowToScreenPosition: (point: XYPosition) => XYPosition;
  /** All internal nodes (with measured geometry). */
  getNodes: () => InternalNode[];
  /** One internal node by id. */
  getNode: (id: string) => InternalNode | undefined;
  /** All edges. */
  getEdges: () => FlowEdge[];
  /** One edge by id. */
  getEdge: (id: string) => FlowEdge | undefined;
}

/** Builds the imperative API over a flow context. */
export function useViewportApi(ctx: FlowContext): FlowApi {
  function center(): XYPosition {
    const rect = ctx.paneRect.value;
    return { x: rect.width / 2, y: rect.height / 2 };
  }

  function zoomBy(factor: number): void {
    const vp = ctx.viewport.value;
    const next = clampZoom(vp.zoom * factor, ctx.minZoom.value, ctx.maxZoom.value);
    if (next === vp.zoom) return;
    ctx.viewport.value = zoomAtPointer(vp, center(), next);
  }

  return {
    getViewport: () => ctx.viewport.value,
    setViewport: (vp) => { ctx.viewport.value = vp; },
    zoomIn: (factor = 1.2) => zoomBy(factor),
    zoomOut: (factor = 1.2) => zoomBy(1 / factor),
    zoomTo: (zoom) => {
      const vp = ctx.viewport.value;
      const next = clampZoom(zoom, ctx.minZoom.value, ctx.maxZoom.value);
      ctx.viewport.value = zoomAtPointer(vp, center(), next);
    },
    fitView: (params = {}) => {
      const rect = ctx.paneRect.value;
      if (rect.width === 0 || rect.height === 0) return;
      const all = [...ctx.nodeLookup.value.values()].filter(n => !n.hidden);
      const subset = params.nodes
        ? all.filter(n => params.nodes!.includes(n.id))
        : all;
      if (subset.length === 0) return;
      const bounds = getNodesBounds(subset);
      ctx.viewport.value = fitViewTransform(bounds, { width: rect.width, height: rect.height }, {
        padding: params.padding ?? 0.1,
        minZoom: ctx.minZoom.value,
        maxZoom: ctx.maxZoom.value,
      });
    },
    screenToFlowPosition: point => ctx.screenToFlow(point),
    flowToScreenPosition: point => ctx.flowToScreen(point),
    getNodes: () => [...ctx.nodeLookup.value.values()],
    getNode: id => ctx.nodeLookup.value.get(id),
    getEdges: () => [...ctx.edgeLookup.value.values()],
    getEdge: id => ctx.edgeLookup.value.get(id),
  };
}
