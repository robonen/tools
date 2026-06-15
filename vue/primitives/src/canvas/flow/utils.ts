import { clamp } from '@robonen/stdlib';
import type {
  Dimensions,
  HandleBound,
  HandleBounds,
  InternalNode,
  Position,
  Rect,
  SelectionMode,
  Viewport,
  XYPosition,
} from './types';

/** Re-exported so flow code has one import surface for clamping. */
export { clamp };

/** A pane origin: only `left`/`top` matter for coordinate conversion. */
export interface PaneOrigin {
  left: number;
  top: number;
}

/**
 * Convert a screen (client) point to flow space.
 *
 * Inverse of {@link flowToScreen}. The client point must have the pane's
 * `left`/`top` subtracted first, then the viewport translation removed and the
 * zoom divided out. On the pointer hot path — no allocations beyond the result.
 */
export function screenToFlow(point: XYPosition, vp: Viewport, origin: PaneOrigin): XYPosition {
  return {
    x: (point.x - origin.left - vp.x) / vp.zoom,
    y: (point.y - origin.top - vp.y) / vp.zoom,
  };
}

/** Convert a flow-space point to a screen (client) point. Inverse of {@link screenToFlow}. */
export function flowToScreen(point: XYPosition, vp: Viewport, origin: PaneOrigin): XYPosition {
  return {
    x: point.x * vp.zoom + vp.x + origin.left,
    y: point.y * vp.zoom + vp.y + origin.top,
  };
}

/**
 * New viewport that keeps `pointer` (pane-relative pixels) fixed on screen while
 * the zoom changes to `newZoom`. Caller is expected to clamp `newZoom` first
 * via {@link clampZoom}.
 */
export function zoomAtPointer(vp: Viewport, pointer: XYPosition, newZoom: number): Viewport {
  const ratio = newZoom / vp.zoom;
  return {
    zoom: newZoom,
    x: pointer.x - (pointer.x - vp.x) * ratio,
    y: pointer.y - (pointer.y - vp.y) * ratio,
  };
}

/**
 * Multiplicative zoom factor for a wheel event, normalising the three
 * `deltaMode` units and amplifying trackpad pinch (`ctrlKey`). Multiply the
 * current zoom by the result.
 */
export function wheelToZoomFactor(event: WheelEvent): number {
  const unit = event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002;
  const delta = -event.deltaY * unit * (event.ctrlKey ? 10 : 1);
  return 2 ** delta;
}

/** Clamp a zoom level to `[min, max]`. */
export function clampZoom(zoom: number, min: number, max: number): number {
  return clamp(zoom, min, max);
}

/** Snap a flow-space point to the nearest grid intersection. */
export function snapPoint(point: XYPosition, grid: [number, number]): XYPosition {
  const [gx, gy] = grid;
  return {
    x: gx ? Math.round(point.x / gx) * gx : point.x,
    y: gy ? Math.round(point.y / gy) * gy : point.y,
  };
}

/** Node geometry needed for bounds/hit-testing: absolute position + measured size. */
export interface NodeBox {
  positionAbsolute: XYPosition;
  measured: Dimensions;
}

/**
 * Bounding rect (flow space) enclosing every node. Single pass. Returns a zero
 * rect when the iterable is empty.
 */
export function getNodesBounds(nodes: Iterable<NodeBox>): Rect {
  let xMin = Infinity;
  let yMin = Infinity;
  let xMax = -Infinity;
  let yMax = -Infinity;
  let seen = false;

  for (const node of nodes) {
    seen = true;
    const { x, y } = node.positionAbsolute;
    const { width, height } = node.measured;
    if (x < xMin) xMin = x;
    if (y < yMin) yMin = y;
    if (x + width > xMax) xMax = x + width;
    if (y + height > yMax) yMax = y + height;
  }

  if (!seen) return { x: 0, y: 0, width: 0, height: 0 };
  return { x: xMin, y: yMin, width: xMax - xMin, height: yMax - yMin };
}

export interface FitViewOptions {
  /** Fractional inset on each side, 0–1. @default 0.1 */
  padding?: number;
  minZoom: number;
  maxZoom: number;
}

/**
 * Viewport that fits `bounds` inside a `container` of the given size, centred,
 * with `padding`. Zoom is clamped to `[minZoom, maxZoom]`.
 */
export function fitViewTransform(bounds: Rect, container: Dimensions, opts: FitViewOptions): Viewport {
  const padding = opts.padding ?? 0.1;
  const { width: cw, height: ch } = container;
  const bw = bounds.width || 1;
  const bh = bounds.height || 1;

  const zoom = clamp(Math.min(cw / bw, ch / bh) * (1 - padding), opts.minZoom, opts.maxZoom);
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  return {
    zoom,
    x: cw / 2 - centerX * zoom,
    y: ch / 2 - centerY * zoom,
  };
}

/** Whether two flow-space rects overlap (touching edges count as overlap). */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x <= b.x + b.width
    && a.x + a.width >= b.x
    && a.y <= b.y + b.height
    && a.y + a.height >= b.y
  );
}

/** Whether rect `a` fully contains rect `b`. */
export function rectContains(a: Rect, b: Rect): boolean {
  return (
    b.x >= a.x
    && b.y >= a.y
    && b.x + b.width <= a.x + a.width
    && b.y + b.height <= a.y + a.height
  );
}

/** Whether a node falls inside a marquee `rect` per the selection `mode`. */
export function nodeInRect(node: NodeBox, rect: Rect, mode: SelectionMode): boolean {
  const box: Rect = {
    x: node.positionAbsolute.x,
    y: node.positionAbsolute.y,
    width: node.measured.width,
    height: node.measured.height,
  };
  return mode === 'full' ? rectContains(rect, box) : rectsIntersect(rect, box);
}

/** Ids of nodes selected by a marquee `rect`. */
export function getNodesInsideRect(
  nodes: Iterable<InternalNode>,
  rect: Rect,
  mode: SelectionMode,
): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    if (node.hidden) continue;
    if (nodeInRect(node, rect, mode)) ids.push(node.id);
  }
  return ids;
}

/**
 * The flow-space rect currently visible through the viewport, expanded by
 * `buffer` screen pixels on each side. Drives virtualization culling.
 */
export function visibleFlowRect(vp: Viewport, container: Dimensions, buffer: number): Rect {
  return {
    x: (-vp.x - buffer) / vp.zoom,
    y: (-vp.y - buffer) / vp.zoom,
    width: (container.width + 2 * buffer) / vp.zoom,
    height: (container.height + 2 * buffer) / vp.zoom,
  };
}

/**
 * Absolute flow position of a node = its `position` plus the sum of every
 * ancestor's position. Guards against cycles via a depth cap.
 */
export function getNodePositionAbsolute(
  node: { id: string; position: XYPosition; parentId?: string },
  lookup: Map<string, InternalNode>,
): XYPosition {
  let x = node.position.x;
  let y = node.position.y;
  let parentId = node.parentId;
  let guard = 0;

  while (parentId && guard++ < 100) {
    const parent = lookup.get(parentId);
    if (!parent) break;
    x += parent.position.x;
    y += parent.position.y;
    parentId = parent.parentId;
  }

  return { x, y };
}

/**
 * Measure a node's handle rectangles from the DOM, relative to the node's
 * top-left and converted to flow space (divided by `zoom`). Called once per
 * measurement, not per frame.
 */
export function getHandleBoundsFromDom(
  nodeEl: HTMLElement,
  zoom: number,
): HandleBounds {
  const nodeRect = nodeEl.getBoundingClientRect();
  const handles = nodeEl.querySelectorAll<HTMLElement>('[data-handleid]');
  const bounds: HandleBounds = { source: [], target: [] };

  for (const handle of handles) {
    const type = (handle.dataset['handletype'] as HandleBound['type']) ?? 'source';
    const rect = handle.getBoundingClientRect();
    const bound: HandleBound = {
      id: handle.dataset['handleid'] || null,
      type,
      position: (handle.dataset['handlepos'] as Position) ?? 'top',
      x: (rect.left - nodeRect.left) / zoom,
      y: (rect.top - nodeRect.top) / zoom,
      width: rect.width / zoom,
      height: rect.height / zoom,
    };
    bounds[type].push(bound);
  }

  return bounds;
}

/** Absolute flow point at the centre of a measured handle. */
export function getAbsoluteHandlePoint(positionAbsolute: XYPosition, handle: HandleBound): XYPosition {
  return {
    x: positionAbsolute.x + handle.x + handle.width / 2,
    y: positionAbsolute.y + handle.y + handle.height / 2,
  };
}

/**
 * Pick a handle from a node's measured bounds. Falls back to the first handle of
 * the right type when `handleId` is null (single-handle nodes).
 */
export function findHandle(
  node: InternalNode | undefined,
  type: HandleBound['type'],
  handleId: string | null | undefined,
): HandleBound | undefined {
  const list = node?.handleBounds?.[type];
  if (!list || list.length === 0) return undefined;
  if (handleId === null || handleId === undefined) return list[0];
  return list.find(h => h.id === handleId) ?? list[0];
}

/**
 * Default attachment point for an edge endpoint when a node has no measured
 * handles yet — the centre of the appropriate side, or the node centre.
 */
export function getDefaultEndpoint(node: NodeBox, position?: Position): XYPosition {
  const { x, y } = node.positionAbsolute;
  const { width, height } = node.measured;
  switch (position) {
    case 'top': return { x: x + width / 2, y };
    case 'bottom': return { x: x + width / 2, y: y + height };
    case 'left': return { x, y: y + height / 2 };
    case 'right': return { x: x + width, y: y + height / 2 };
    default: return { x: x + width / 2, y: y + height / 2 };
  }
}
