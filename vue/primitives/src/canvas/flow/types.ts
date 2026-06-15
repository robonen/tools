/**
 * Domain model for the headless flow canvas.
 *
 * Public types (`FlowNode`, `FlowEdge`, `Viewport`, …) are what consumers bind
 * through `v-model` and serialize. Internal types (`InternalNode`,
 * `HandleBound`, `ConnectionState`) live only in the state layer and are never
 * emitted — they hold measured DOM geometry derived from the public model.
 */

/** A point in flow space (unscaled, viewport-independent coordinates). */
export interface XYPosition {
  x: number;
  y: number;
}

/** Measured size of an element in flow space. */
export interface Dimensions {
  width: number;
  height: number;
}

/** Axis-aligned rectangle in flow space. */
export interface Rect extends XYPosition, Dimensions {}

/**
 * The single master transform. `x`/`y` are unscaled screen pixels applied
 * *before* `scale(zoom)` on the one transformed layer (`transform-origin:0 0`).
 */
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

/** Side of a node a handle/edge attaches to. */
export type Position = 'top' | 'right' | 'bottom' | 'left';

/** Whether a handle starts (`source`) or ends (`target`) a connection. */
export type HandleType = 'source' | 'target';

/** SVG arrowhead descriptor resolved into a shared `<defs>` marker. */
export interface EdgeMarker {
  type: 'arrow' | 'arrowclosed';
  color?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  orient?: string;
  markerUnits?: string;
}

export type EdgeMarkerType = EdgeMarker | string;

/**
 * Public node model. Bound via `v-model:nodes`; only these fields round-trip
 * through serialization. `data` carries the consumer's payload.
 */
export interface FlowNode<Data = unknown, Type extends string = string> {
  /** Unique, stable identity. Used as the render key — never reuse. */
  id: string;
  /** Position in flow space. Relative to `parentId` when set. */
  position: XYPosition;
  /** Consumer payload passed to the node slot/component. */
  data?: Data;
  /** Resolves the renderer via `nodeTypes` / `#node-<type>` slot. */
  type?: Type;
  /** Optional explicit width; otherwise measured from the DOM. */
  width?: number;
  /** Optional explicit height; otherwise measured from the DOM. */
  height?: number;
  /** Default side for outgoing edges when a node renders implicit handles. */
  sourcePosition?: Position;
  /** Default side for incoming edges. */
  targetPosition?: Position;
  /** Per-node override of the global drag flag. */
  draggable?: boolean;
  /** Per-node override of the global selectable flag. */
  selectable?: boolean;
  /** Per-node override of the global connectable flag. */
  connectable?: boolean;
  /** Per-node override of the global deletable flag. */
  deletable?: boolean;
  /** Selection state mirrored from the canonical selection Set on serialize. */
  selected?: boolean;
  /** Skip rendering without removing from the model. */
  hidden?: boolean;
  /** Parent node id for subflows; `position` becomes parent-relative. */
  parentId?: string;
  /** Constrain dragging to the parent's box or an explicit rect. */
  extent?: 'parent' | [[number, number], [number, number]];
  /** Explicit stacking order; otherwise derived (selected/dragging lift). */
  zIndex?: number;
  /** Accessible label override for keyboard users / screen readers. */
  ariaLabel?: string;
}

/**
 * State-layer node. Extends the public node with measured geometry that is
 * recomputed from the DOM (never serialized). Lives in `nodeLookup`.
 */
export interface InternalNode<Data = unknown, Type extends string = string>
  extends FlowNode<Data, Type> {
  /** Measured size in flow space (from the shared ResizeObserver). */
  measured: Dimensions;
  /** Absolute flow position = sum of the `parentId` chain + `position`. */
  positionAbsolute: XYPosition;
  /** Handle rects measured once per node (already divided by zoom). */
  handleBounds: HandleBounds | null;
  /** Live drag flag; set on pointerdown, cleared on commit. */
  dragging?: boolean;
  /**
   * @internal The public node this entry was derived from. Identity is the
   * change signal: when the consumer replaces a node object, reconcile rebuilds
   * a fresh `InternalNode` so that node (and only that node) re-renders.
   */
  _source?: FlowNode<Data, Type>;
}

/** Measured handle rectangles grouped by type, in node-local flow space. */
export interface HandleBounds {
  source: HandleBound[];
  target: HandleBound[];
}

/** One measured handle anchor relative to its node's top-left, in flow space. */
export interface HandleBound {
  id: string | null;
  type: HandleType;
  position: Position;
  /** Offset from node left, flow space. */
  x: number;
  /** Offset from node top, flow space. */
  y: number;
  width: number;
  height: number;
}

/**
 * Public edge model. Bound via `v-model:edges`. Endpoints reference node ids
 * and optional handle ids.
 */
export interface FlowEdge<Data = unknown, Type extends string = string> {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  /** Resolves the renderer via `edgeTypes` / `#edge-<type>` slot. */
  type?: Type;
  data?: Data;
  label?: string;
  selected?: boolean;
  animated?: boolean;
  hidden?: boolean;
  deletable?: boolean;
  selectable?: boolean;
  updatable?: boolean;
  markerStart?: EdgeMarkerType;
  markerEnd?: EdgeMarkerType;
  zIndex?: number;
  ariaLabel?: string;
}

/** A proposed or committed connection between two handles. */
export interface Connection {
  source: string;
  target: string;
  sourceHandle: string | null;
  targetHandle: string | null;
}

/** Strict requires matching source→target types; loose allows any handle. */
export type ConnectionMode = 'strict' | 'loose';

/** Predicate gating which connections may be committed. */
export type IsValidConnection = (connection: Connection) => boolean;

/** Live state of an in-progress connection drag (only the preview subscribes). */
export interface ConnectionState {
  inProgress: boolean;
  /** Node the drag originated from. */
  fromNode: string | null;
  /** Handle the drag originated from. */
  fromHandle: HandleBound | null;
  /** Absolute flow position of the origin handle. */
  fromPosition: XYPosition | null;
  /** Whether the origin acts as source or target (loose mode can invert). */
  fromType: HandleType | null;
  /** Current pointer position in flow space. */
  toPosition: XYPosition | null;
  /** Hovered candidate handle, if any. */
  toHandle: HandleBound | null;
  toNode: string | null;
  /** Null until a candidate is hovered; then validity of dropping there. */
  isValid: boolean | null;
}

/** Whether a node counts as "inside" a marquee rect. */
export type SelectionMode = 'partial' | 'full';

/** Granular node mutations emitted via `@nodes-change`. */
export type NodeChange<Data = unknown>
  = | { type: 'position'; id: string; position?: XYPosition; dragging?: boolean }
    | { type: 'dimensions'; id: string; dimensions: Dimensions; resizing?: boolean }
    | { type: 'select'; id: string; selected: boolean }
    | { type: 'remove'; id: string }
    | { type: 'add'; item: FlowNode<Data>; index?: number }
    | { type: 'replace'; id: string; item: FlowNode<Data> };

/** Granular edge mutations emitted via `@edges-change`. */
export type EdgeChange<Data = unknown>
  = | { type: 'select'; id: string; selected: boolean }
    | { type: 'remove'; id: string }
    | { type: 'add'; item: FlowEdge<Data>; index?: number }
    | { type: 'replace'; id: string; item: FlowEdge<Data> };

/** Override strings for screen-reader announcements (i18n). */
export interface AriaLabelConfig {
  'node.a11yDescription.default'?: string;
  'node.a11yDescription.keyboardDisabled'?: string;
  'edge.a11yDescription.default'?: string;
  'controls.ariaLabel'?: string;
  'minimap.ariaLabel'?: string;
}
