<script lang="ts">
import type { Component, Ref } from 'vue';
import type { PrimitiveProps } from '../../internal/primitive';
import type {
  Connection,
  ConnectionMode,
  ConnectionState,
  Dimensions,
  EdgeChange,
  FlowEdge,
  FlowNode,
  HandleType,
  InternalNode,
  IsValidConnection,
  NodeChange,
  SelectionMode,
  Viewport,
  XYPosition,
} from './types';

/**
 * Root of the headless flow canvas. Owns node/edge/viewport state (two-way via
 * `v-model:nodes` / `v-model:edges` / `v-model:viewport`, or uncontrolled via
 * `defaultNodes` / `defaultEdges` / `defaultViewport`), reconciles the public
 * arrays into internal `shallowRef` Maps for O(1) reads, and provides
 * `FlowContext` to every part. It renders the standard `FlowPane → FlowViewport
 * → (edges, nodes)` subtree and exposes the default slot for absolutely-
 * positioned chrome (Background / Controls / MiniMap / Panel). Customise node
 * and edge rendering with `nodeTypes` / `edgeTypes` component maps or the
 * `#node-<type>` / `#edge-<type>` scoped slots. Emits granular `@nodes-change` /
 * `@edges-change` alongside `v-model`, so consumers may own their data.
 */
export interface FlowRootProps extends PrimitiveProps {
  /** Uncontrolled initial nodes (ignored when `v-model:nodes` is bound). */
  defaultNodes?: FlowNode[];
  /** Uncontrolled initial edges. */
  defaultEdges?: FlowEdge[];
  /** Uncontrolled initial viewport. @default { x:0, y:0, zoom:1 } */
  defaultViewport?: Viewport;
  /** Minimum zoom level. @default 0.5 */
  minZoom?: number;
  /** Maximum zoom level. @default 2 */
  maxZoom?: number;
  /** Global drag enable (per-node `draggable` overrides). @default true */
  nodesDraggable?: boolean;
  /** Global connect enable (per-node `connectable` overrides). @default true */
  nodesConnectable?: boolean;
  /** Global selection enable. @default true */
  elementsSelectable?: boolean;
  /** Snap dragged nodes to a grid. @default false */
  snapToGrid?: boolean;
  /** Grid spacing `[x, y]` for `snapToGrid`. @default [15, 15] */
  snapGrid?: [number, number];
  /** Connection validity model. @default 'strict' */
  connectionMode?: ConnectionMode;
  /** Pixel radius for snapping a connection to a nearby handle. @default 20 */
  connectionRadius?: number;
  /** Marquee inclusion rule. @default 'partial' */
  selectionMode?: SelectionMode;
  /** Raise z-index of selected nodes. @default true */
  elevateNodesOnSelect?: boolean;
  /** Component map keyed by `node.type`. Define module-level, never inline. */
  nodeTypes?: Record<string, Component>;
  /** Component map keyed by `edge.type`. */
  edgeTypes?: Record<string, Component>;
  /** Default edge type when an edge has none. @default 'default' */
  defaultEdgeType?: string;
  /** Master interactivity switch (lock). @default true */
  interactive?: boolean;
  /** Disable the keyboard a11y layer + `role=application`. @default false */
  disableKeyboardA11y?: boolean;
  /** Global connection validator, overridable per handle. */
  isValidConnection?: IsValidConnection;
  /** Cull nodes/edges outside the viewport — for large graphs. @default false */
  onlyRenderVisibleElements?: boolean;
  /** Extra px kept rendered around the viewport when virtualizing. @default 200 */
  virtualizationBuffer?: number;
}

export interface FlowRootEmits {
  nodesChange: [changes: NodeChange[]];
  edgesChange: [changes: EdgeChange[]];
  connect: [connection: Connection];
  connectStart: [payload: { nodeId: string; handleId: string | null; handleType: HandleType }];
  connectEnd: [];
  nodeDragStop: [ids: string[]];
  selectionChange: [selection: { nodes: string[]; edges: string[] }];
  paneClick: [event: PointerEvent];
  nodeClick: [id: string, event: PointerEvent];
  edgeClick: [id: string, event: PointerEvent];
}
</script>

<script setup lang="ts">
import { computed, shallowRef, toRef, triggerRef, useSlots, watch } from 'vue';
import { useId } from '@robonen/vue';
import FlowPane from './FlowPane.vue';
import FlowViewport from './FlowViewport.vue';
import FlowNodeRenderer from './FlowNodeRenderer.vue';
import FlowEdgeRenderer from './FlowEdgeRenderer.vue';
import { provideFlowContext } from './context';
import type { FlowContext, FlowSelection, HandleRegistration } from './context';
import { flowToScreen, getNodePositionAbsolute, screenToFlow, visibleFlowRect } from './utils';
import { buildConnection, connectionToEdgeId, findClosestHandle, isValidConnection as isValidConnectionGate } from './connection';
import { getVisibleEdgeIds, getVisibleNodeIds } from './virtualization';
import { useViewportApi } from './composables/useViewportApi';
import { useInteractionState } from './composables/useInteractionState';

const {
  defaultNodes,
  defaultEdges,
  defaultViewport,
  minZoom = 0.5,
  maxZoom = 2,
  nodesDraggable = true,
  nodesConnectable = true,
  elementsSelectable = true,
  snapToGrid = false,
  snapGrid = [15, 15],
  connectionMode = 'strict',
  connectionRadius = 20,
  selectionMode = 'partial',
  interactive = true,
  disableKeyboardA11y = false,
  isValidConnection,
  onlyRenderVisibleElements = false,
  virtualizationBuffer = 200,
  as = 'div',
} = defineProps<FlowRootProps>();

const emit = defineEmits<FlowRootEmits>();
const slots = useSlots();

const flowId = useId(undefined, 'flow').value;

// ── models (controlled + uncontrolled) ────────────────────────────────────
const localNodes = shallowRef<FlowNode[]>(defaultNodes ? defaultNodes.slice() : []);
const nodes = defineModel<FlowNode[]>('nodes', {
  get: external => external ?? localNodes.value,
  set: (value) => {
    localNodes.value = value;
    return value;
  },
});

const localEdges = shallowRef<FlowEdge[]>(defaultEdges ? defaultEdges.slice() : []);
const edges = defineModel<FlowEdge[]>('edges', {
  get: external => external ?? localEdges.value,
  set: (value) => {
    localEdges.value = value;
    return value;
  },
});

const localViewport = shallowRef<Viewport>(defaultViewport ?? { x: 0, y: 0, zoom: 1 });
const viewport = defineModel<Viewport>('viewport', {
  get: external => external ?? localViewport.value,
  set: (value) => {
    localViewport.value = value;
    return value;
  },
});

// ── derived state (shallow Maps; nodes updated IMMUTABLY — a changed node is
// replaced with a new object so its per-node `computed(()=>lookup.get(id))`
// sees a new identity and re-renders; untouched nodes keep identity so they
// don't. In-place mutation would make that computed short-circuit and the node
// would never visually update). ────────────────────────────────────────────
const nodeLookup = shallowRef(new Map<string, InternalNode>());
const edgeLookup = shallowRef(new Map<string, FlowEdge>());
const selection = shallowRef<FlowSelection>({ nodes: new Set(), edges: new Set() });
const paneRect = shallowRef({ left: 0, top: 0, width: 0, height: 0 });
const isDragging = shallowRef(false);
const draggedIds = new Set<string>();
const isInteracting = useInteractionState(() => viewport.value);
let hasParenting = false;

function reconcileNodes(): void {
  // During an active drag the model array is stale on purpose; don't clobber
  // the live in-place positions until pointerup commits them.
  if (isDragging.value) return;

  const arr = nodes.value ?? [];
  const map = nodeLookup.value;
  const seen = new Set<string>();
  hasParenting = false;

  for (const n of arr) {
    seen.add(n.id);
    if (n.parentId) hasParenting = true;
    const existing = map.get(n.id);
    // Unchanged public node object → keep the existing internal entry (identity
    // stable so this node won't re-render on unrelated updates).
    if (existing && existing._source === n) continue;
    map.set(n.id, {
      ...n,
      measured: existing?.measured ?? { width: n.width ?? 0, height: n.height ?? 0 },
      positionAbsolute: { x: n.position.x, y: n.position.y },
      handleBounds: existing?.handleBounds ?? null,
      dragging: existing?.dragging ?? false,
      _source: n,
    });
  }

  for (const id of map.keys()) if (!seen.has(id)) map.delete(id);

  // Recompute absolute positions; clone only the entries whose value changed.
  for (const node of map.values()) {
    const abs = getNodePositionAbsolute(node, map);
    if (abs.x !== node.positionAbsolute.x || abs.y !== node.positionAbsolute.y)
      map.set(node.id, { ...node, positionAbsolute: abs });
  }

  triggerRef(nodeLookup);
}

function reconcileEdges(): void {
  const arr = edges.value ?? [];
  const map = edgeLookup.value;
  const seen = new Set<string>();
  for (const e of arr) {
    seen.add(e.id);
    map.set(e.id, e);
  }
  for (const id of map.keys()) if (!seen.has(id)) map.delete(id);
  triggerRef(edgeLookup);
}

watch(nodes, reconcileNodes, { immediate: true });
watch(edges, reconcileEdges, { immediate: true });

const visibleNodeIds = computed(() => {
  const all = (nodes.value ?? []).filter(n => !n.hidden);
  if (!onlyRenderVisibleElements) return all.map(n => n.id);
  const rect = visibleFlowRect(viewport.value!, paneRect.value, virtualizationBuffer);
  return getVisibleNodeIds(all, nodeLookup.value, rect);
});

const visibleNodeSet = computed(() => new Set(visibleNodeIds.value));

const visibleEdgeIds = computed(() => {
  const all = (edges.value ?? []).filter(e => !e.hidden);
  if (!onlyRenderVisibleElements) return all.map(e => e.id);
  return getVisibleEdgeIds(all, visibleNodeSet.value);
});

// ── coordinate actions ──────────────────────────────────────────────────────
function toFlow(point: XYPosition): XYPosition {
  return screenToFlow(point, viewport.value!, paneRect.value);
}
function toScreen(point: XYPosition): XYPosition {
  return flowToScreen(point, viewport.value!, paneRect.value);
}
function setPaneRect(rect: { left: number; top: number; width: number; height: number }): void {
  paneRect.value = rect;
}

// ── node mutation ─────────────────────────────────────────────────────────
/**
 * Re-derive absolute positions, cloning only the entries whose value changed.
 * Hot during a drag of nested nodes (loops every node each frame), so the
 * parent-chain sum is inlined to avoid a throwaway `{x,y}` per unchanged node
 * (mirrors `getNodePositionAbsolute`, incl. its cycle-guard).
 */
function recomputeAbsolute(map: Map<string, InternalNode>): void {
  const ids = hasParenting ? map.keys() : draggedIds;
  for (const id of ids) {
    const n = map.get(id);
    if (!n) continue;
    let x = n.position.x;
    let y = n.position.y;
    let parentId = n.parentId;
    let guard = 0;
    while (parentId && guard++ < 100) {
      const parent = map.get(parentId);
      if (!parent) break;
      x += parent.position.x;
      y += parent.position.y;
      parentId = parent.parentId;
    }
    if (x !== n.positionAbsolute.x || y !== n.positionAbsolute.y)
      map.set(id, { ...n, positionAbsolute: { x, y } });
  }
}

function updateNodePositions(positions: Map<string, XYPosition>, dragging: boolean): void {
  isDragging.value = dragging;
  const map = nodeLookup.value;
  for (const [id, pos] of positions) {
    const n = map.get(id);
    if (!n) continue;
    // Replace with a NEW object (immutable) so this node's per-node computed
    // sees a new identity and re-renders. For root nodes set absolute inline.
    const next: InternalNode = { ...n, position: pos, dragging };
    if (!n.parentId) next.positionAbsolute = { x: pos.x, y: pos.y };
    map.set(id, next);
    draggedIds.add(id);
  }
  if (hasParenting) recomputeAbsolute(map);
  triggerRef(nodeLookup);
}

function commitNodeDrag(): void {
  isDragging.value = false;
  if (draggedIds.size === 0) return;
  const ids = [...draggedIds];
  const map = nodeLookup.value;
  const changes: NodeChange[] = [];
  for (const id of ids) {
    const n = map.get(id);
    if (!n) continue;
    map.set(id, { ...n, dragging: false });
    changes.push({ type: 'position', id, position: { x: n.position.x, y: n.position.y }, dragging: false });
  }
  draggedIds.clear();
  triggerRef(nodeLookup);

  const posById = new Map(changes.map(c => [c.id, (c as Extract<NodeChange, { type: 'position' }>).position!]));
  nodes.value = (nodes.value ?? []).map(n => (posById.has(n.id) ? { ...n, position: posById.get(n.id)! } : n));
  emit('nodesChange', changes);
  emit('nodeDragStop', ids);
}

function setNodeMeasured(id: string, size: Dimensions, handleBounds: InternalNode['handleBounds']): void {
  const map = nodeLookup.value;
  const n = map.get(id);
  if (!n) return;
  const sizeChanged = n.measured.width !== size.width || n.measured.height !== size.height;
  // New object so the node (and its incident edges, via the node computeds)
  // pick up the fresh measurement / handle geometry.
  map.set(id, { ...n, measured: sizeChanged ? size : n.measured, handleBounds });
  triggerRef(nodeLookup);
}

function updateNode(id: string, patch: Partial<FlowNode>): void {
  nodes.value = (nodes.value ?? []).map(n => (n.id === id ? { ...n, ...patch } : n));
  const changes: NodeChange[] = [];
  if (patch.position) changes.push({ type: 'position', id, position: patch.position });
  if (patch.width !== undefined || patch.height !== undefined)
    changes.push({ type: 'dimensions', id, dimensions: { width: patch.width ?? 0, height: patch.height ?? 0 } });
  if (changes.length) emit('nodesChange', changes);
}

// ── selection ─────────────────────────────────────────────────────────────
function emitSelection(): void {
  emit('selectionChange', { nodes: [...selection.value.nodes], edges: [...selection.value.edges] });
}

function selectNode(id: string, additive = false): void {
  if (!elementsSelectable) return;
  const sel = selection.value;
  const nextNodes = additive ? new Set(sel.nodes) : new Set<string>();
  const nextEdges = additive ? new Set(sel.edges) : new Set<string>();
  if (additive && nextNodes.has(id)) nextNodes.delete(id);
  else nextNodes.add(id);
  selection.value = { nodes: nextNodes, edges: nextEdges };
  emitSelection();
}

function selectEdge(id: string, additive = false): void {
  if (!elementsSelectable) return;
  const sel = selection.value;
  const nextNodes = additive ? new Set(sel.nodes) : new Set<string>();
  const nextEdges = additive ? new Set(sel.edges) : new Set<string>();
  if (additive && nextEdges.has(id)) nextEdges.delete(id);
  else nextEdges.add(id);
  selection.value = { nodes: nextNodes, edges: nextEdges };
  emitSelection();
}

function setSelection(nodeIds: string[], edgeIds: string[]): void {
  selection.value = { nodes: new Set(nodeIds), edges: new Set(edgeIds) };
  emitSelection();
}

function clearSelection(): void {
  if (selection.value.nodes.size === 0 && selection.value.edges.size === 0) return;
  selection.value = { nodes: new Set(), edges: new Set() };
  emitSelection();
}

function removeSelected(): void {
  const sel = selection.value;
  if (sel.nodes.size === 0 && sel.edges.size === 0) return;
  const removedNodes = sel.nodes;
  const nodeChanges: NodeChange[] = [...removedNodes].map(id => ({ type: 'remove', id }));
  const edgeChanges: EdgeChange[] = [];
  for (const e of edges.value ?? []) {
    if (sel.edges.has(e.id) || removedNodes.has(e.source) || removedNodes.has(e.target))
      edgeChanges.push({ type: 'remove', id: e.id });
  }
  const removedEdges = new Set(edgeChanges.map(c => c.id));
  nodes.value = (nodes.value ?? []).filter(n => !removedNodes.has(n.id));
  edges.value = (edges.value ?? []).filter(e => !removedEdges.has(e.id));
  selection.value = { nodes: new Set(), edges: new Set() };
  if (nodeChanges.length) emit('nodesChange', nodeChanges);
  if (edgeChanges.length) emit('edgesChange', edgeChanges);
  emitSelection();
}

// ── connection (state setters; FSM hit-test wired by useConnection) ─────────
function idleConnection(): ConnectionState {
  return {
    inProgress: false,
    fromNode: null,
    fromHandle: null,
    fromPosition: null,
    fromType: null,
    toPosition: null,
    toHandle: null,
    toNode: null,
    isValid: null,
  };
}
const connection = shallowRef<ConnectionState>(idleConnection());

function startConnection(from: HandleRegistration, nodeId: string): void {
  if (!nodesConnectable || !interactive) return;
  const node = nodeLookup.value.get(nodeId);
  const handleBound = node?.handleBounds?.[from.type]?.find(h => h.id === from.id) ?? null;
  connection.value = {
    inProgress: true,
    fromNode: nodeId,
    fromHandle: handleBound,
    fromPosition: handleBound && node
      ? { x: node.positionAbsolute.x + handleBound.x + handleBound.width / 2, y: node.positionAbsolute.y + handleBound.y + handleBound.height / 2 }
      : null,
    fromType: from.type,
    toPosition: null,
    toHandle: null,
    toNode: null,
    isValid: null,
  };
  emit('connectStart', { nodeId, handleId: from.id, handleType: from.type });
}

function updateConnection(flowPoint: XYPosition): void {
  const c = connection.value;
  if (!c.inProgress || !c.fromType || !c.fromNode || !c.fromHandle) return;

  const radiusFlow = connectionRadius / (viewport.value!.zoom || 1);
  const candidate = findClosestHandle(
    flowPoint, nodeLookup.value, c.fromType, c.fromNode, c.fromHandle.id, connectionMode, radiusFlow,
  );

  let toHandle = null;
  let toNode = null;
  let isValid: boolean | null = null;
  if (candidate) {
    toHandle = candidate.handle;
    toNode = candidate.nodeId;
    const conn = buildConnection(c.fromType, c.fromNode, c.fromHandle, candidate);
    isValid = isValidConnectionGate(conn, edges.value ?? [], isValidConnection);
  }

  connection.value = { ...c, toPosition: flowPoint, toHandle, toNode, isValid };
}

function endConnection(): void {
  const c = connection.value;
  if (!c.inProgress) return;

  if (c.isValid && c.toHandle && c.toNode && c.fromHandle && c.fromNode && c.fromType) {
    const target = { nodeId: c.toNode, handle: c.toHandle };
    const conn = buildConnection(c.fromType, c.fromNode, c.fromHandle, target);
    const newEdge: FlowEdge = { id: connectionToEdgeId(conn), ...conn };
    edges.value = [...(edges.value ?? []), newEdge];
    emit('connect', conn);
    emit('edgesChange', [{ type: 'add', item: newEdge }]);
  }

  connection.value = idleConnection();
  emit('connectEnd');
}

// ── provide ──────────────────────────────────────────────────────────────
const context: FlowContext = {
  flowId,
  viewport: viewport as unknown as Ref<Viewport>,
  paneRect,
  minZoom: toRef(() => minZoom),
  maxZoom: toRef(() => maxZoom),
  isInteracting,
  nodesDraggable: toRef(() => nodesDraggable),
  nodesConnectable: toRef(() => nodesConnectable),
  elementsSelectable: toRef(() => elementsSelectable),
  snapToGrid: toRef(() => snapToGrid),
  snapGrid: toRef(() => snapGrid),
  connectionMode: toRef(() => connectionMode),
  connectionRadius: toRef(() => connectionRadius),
  selectionMode: toRef(() => selectionMode),
  interactive: toRef(() => interactive),
  disableKeyboardA11y: toRef(() => disableKeyboardA11y),
  nodeLookup,
  edgeLookup,
  selection,
  connection,
  visibleNodeIds,
  visibleEdgeIds,
  screenToFlow: toFlow,
  flowToScreen: toScreen,
  setPaneRect,
  updateNodePositions,
  commitNodeDrag,
  setNodeMeasured,
  updateNode,
  isDragging,
  selectNode,
  selectEdge,
  setSelection,
  clearSelection,
  removeSelected,
  startConnection,
  updateConnection,
  endConnection,
  emitNodesChange: changes => emit('nodesChange', changes),
  emitEdgesChange: changes => emit('edgesChange', changes),
};
provideFlowContext(context);

// Imperative API, also exposed so consumers can drive the flow via a template ref.
const api = useViewportApi(context);

const nodeSlotNames = computed(() => Object.keys(slots).filter(n => n === 'node' || n.startsWith('node-')));
const edgeSlotNames = computed(() => Object.keys(slots).filter(n => n === 'edge' || n.startsWith('edge-')));

defineExpose({
  ...api,
  viewport,
  nodes,
  edges,
  selection,
  selectNode,
  selectEdge,
  setSelection,
  clearSelection,
  removeSelected,
});
</script>

<template>
  <FlowPane :as="as">
    <FlowViewport>
      <FlowEdgeRenderer :edge-types="edgeTypes">
        <template
          v-for="name in edgeSlotNames"
          :key="name"
          #[name]="sp"
        >
          <slot
            :name="name"
            v-bind="sp ?? {}"
          />
        </template>
      </FlowEdgeRenderer>

      <FlowNodeRenderer :node-types="nodeTypes">
        <template
          v-for="name in nodeSlotNames"
          :key="name"
          #[name]="sp"
        >
          <slot
            :name="name"
            v-bind="sp ?? {}"
          />
        </template>
      </FlowNodeRenderer>
    </FlowViewport>

    <slot />
  </FlowPane>
</template>
