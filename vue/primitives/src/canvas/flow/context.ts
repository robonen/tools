import type { ComputedRef, Ref, ShallowRef } from 'vue';
import { useContextFactory } from '@robonen/vue';
import type {
  ConnectionMode,
  ConnectionState,
  Dimensions,
  EdgeChange,
  FlowEdge,
  FlowNode,
  HandleType,
  InternalNode,
  NodeChange,
  Position,
  SelectionMode,
  Viewport,
  XYPosition,
} from './types';

/**
 * Namespaced collection keys. Two `useCollectionProvider` instances live under
 * one `FlowRoot` — one for node elements, one for edge `<g>` elements — so they
 * MUST use distinct keys, otherwise the inner provider shadows the outer for
 * every descendant (see `useCollection` namespacing note).
 */
export const FLOW_NODES_COLLECTION = 'flow-nodes';
export const FLOW_EDGES_COLLECTION = 'flow-edges';

/** Canonical selection store: Sets give O(1) membership on the hot path. */
export interface FlowSelection {
  nodes: Set<string>;
  edges: Set<string>;
}

/** A handle registering itself into its node's sub-context. */
export interface HandleRegistration {
  id: string | null;
  type: HandleType;
  position: Position;
  element: HTMLElement;
}

/**
 * Root context shared by every flow part. Reactive fields are `Ref`/`ShallowRef`
 * (never raw values — descendants would lose reactivity); mutations go through
 * the action functions so behaviour stays in one place.
 */
export interface FlowContext {
  /** Stable id for scoping DOM ids / marker ids per flow instance. */
  flowId: string;

  // ── viewport + measurement ──────────────────────────────────────────────
  /** The master transform `{x,y,zoom}`. */
  viewport: Ref<Viewport>;
  /** Live bounding rect of `FlowPane`; the screen origin for coord math. */
  paneRect: Readonly<Ref<{ left: number; top: number; width: number; height: number }>>;
  minZoom: Ref<number>;
  maxZoom: Ref<number>;
  /** True while the viewport is actively panning/zooming (gates `will-change`). */
  isInteracting: Readonly<Ref<boolean>>;

  // ── capability flags (global defaults, overridable per element) ───────────
  nodesDraggable: Ref<boolean>;
  nodesConnectable: Ref<boolean>;
  elementsSelectable: Ref<boolean>;
  snapToGrid: Ref<boolean>;
  snapGrid: Ref<[number, number]>;
  connectionMode: Ref<ConnectionMode>;
  connectionRadius: Ref<number>;
  selectionMode: Ref<SelectionMode>;
  /** Master interactivity switch (lock). */
  interactive: Ref<boolean>;
  /** Disable the keyboard a11y layer (and `role=application`). */
  disableKeyboardA11y: Ref<boolean>;

  // ── data access (shallow Maps — mutate in place + triggerRef) ────────────
  /** Read path for components, keyed by node id. */
  nodeLookup: ShallowRef<Map<string, InternalNode>>;
  /** Read path for components, keyed by edge id. */
  edgeLookup: ShallowRef<Map<string, FlowEdge>>;
  /** Canonical selection state (replace wholesale + triggerRef). */
  selection: ShallowRef<FlowSelection>;
  /** Live connection-drag state (only the preview + hovered handle subscribe). */
  connection: ShallowRef<ConnectionState>;
  /** Ordered id list of currently rendered (post-virtualization) nodes. */
  visibleNodeIds: ComputedRef<string[]>;
  /** Ordered id list of currently rendered edges. */
  visibleEdgeIds: ComputedRef<string[]>;

  // ── coordinate actions ───────────────────────────────────────────────────
  /** Screen (client) point → flow space. */
  screenToFlow: (point: XYPosition) => XYPosition;
  /** Flow space → screen (client) point. */
  flowToScreen: (point: XYPosition) => XYPosition;
  /** `FlowPane` reports its live bounding rect here (the screen origin). */
  setPaneRect: (rect: { left: number; top: number; width: number; height: number }) => void;

  // ── node actions ─────────────────────────────────────────────────────────
  /** Apply a batch of per-node flow-space deltas (drag). Transient. */
  updateNodePositions: (deltas: Map<string, XYPosition>, dragging: boolean) => void;
  /** Commit the in-flight drag overlay into the model (one change). */
  commitNodeDrag: () => void;
  /** Write a measured size for a node into `nodeLookup`. */
  setNodeMeasured: (id: string, size: Dimensions, handleBounds: InternalNode['handleBounds']) => void;
  /** Patch a node in the model (e.g. resize/move) and emit the matching change. */
  updateNode: (id: string, patch: Partial<FlowNode>) => void;
  /** True while a node drag is in progress (blocks external sync clobber). */
  isDragging: Readonly<Ref<boolean>>;

  // ── selection actions ────────────────────────────────────────────────────
  selectNode: (id: string, additive?: boolean) => void;
  selectEdge: (id: string, additive?: boolean) => void;
  setSelection: (nodes: string[], edges: string[]) => void;
  clearSelection: () => void;
  removeSelected: () => void;

  // ── connection actions ───────────────────────────────────────────────────
  startConnection: (from: HandleRegistration, nodeId: string) => void;
  updateConnection: (flowPoint: XYPosition) => void;
  endConnection: () => void;

  // ── change emission ──────────────────────────────────────────────────────
  emitNodesChange: (changes: NodeChange[]) => void;
  emitEdgesChange: (changes: EdgeChange[]) => void;
}

const flow = useContextFactory<FlowContext>('FlowContext');
export const provideFlowContext = flow.provide;
export const useFlowContext = flow.inject;

/**
 * Per-node sub-context. Read by `FlowHandle`, `FlowNodeResizer`,
 * `FlowNodeToolbar` so they never DOM-walk to find their node's state.
 */
export interface FlowNodeContext {
  nodeId: string;
  node: ComputedRef<InternalNode | undefined>;
  positionAbsolute: ComputedRef<XYPosition>;
  measured: ComputedRef<Dimensions>;
  selected: ComputedRef<boolean>;
  dragging: ComputedRef<boolean>;
  connectable: ComputedRef<boolean>;
  /** Element of the node wrapper, for handle measurement. */
  nodeRef: Readonly<Ref<HTMLElement | undefined>>;
  registerHandle: (reg: HandleRegistration) => void;
  unregisterHandle: (id: string | null, type: HandleType) => void;
}

const flowNode = useContextFactory<FlowNodeContext>('FlowNodeContext');
export const provideFlowNodeContext = flowNode.provide;
export const useFlowNodeContext = flowNode.inject;
