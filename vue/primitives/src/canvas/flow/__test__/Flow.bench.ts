import { bench, describe } from 'vitest';
import { mount } from '@vue/test-utils';
import { h } from 'vue';
import {
  FlowRoot,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  findClosestHandle,
  fitViewTransform,
  flowToScreen,
  getBezierPath,
  getNodePositionAbsolute,
  getNodesBounds,
  getNodesInsideRect,
  getSmoothStepPath,
  getStepPath,
  getStraightPath,
  getVisibleEdgeIds,
  getVisibleNodeIds,
  screenToFlow,
  snapPoint,
  visibleFlowRect,
  zoomAtPointer,
} from '../index';
import type {
  EdgeChange,
  FlowEdge,
  FlowNode,
  HandleBound,
  HandleBounds,
  InternalNode,
  NodeChange,
  Position,
  Rect,
  Viewport,
  XYPosition,
} from '../index';

// ── Deterministic fixtures (no Math.random; seeded by index/formula) ──────────
//
// A flow graph laid out on a grid. Node `i` sits at a spread-out position so the
// bounds/cull/spatial math sees a realistic non-degenerate spread, and edges chain
// node `i → i+1` plus a few cross-links so the visible-edge fan-out is non-trivial.

const SIDES: Position[] = ['top', 'right', 'bottom', 'left'];
const NODE_W = 160;
const NODE_H = 56;

function seededNode(i: number): FlowNode<{ label: string }> {
  // Deterministic 2D layout: 40 columns, rows below, with a per-index jitter.
  const col = i % 40;
  const row = Math.floor(i / 40);
  return {
    id: `n${i}`,
    type: 'process',
    position: { x: col * 240 + (i % 7) * 13, y: row * 180 + (i % 5) * 11 },
    data: { label: `Step ${i}` },
  };
}

function seededInternalNode(i: number): InternalNode<{ label: string }> {
  const base = seededNode(i);
  const handleBounds: HandleBounds = {
    target: [{ id: null, type: 'target', position: 'left', x: 0, y: NODE_H / 2, width: 10, height: 10 }],
    source: [{ id: null, type: 'source', position: 'right', x: NODE_W, y: NODE_H / 2, width: 10, height: 10 }],
  };
  return {
    ...base,
    measured: { width: NODE_W, height: NODE_H },
    positionAbsolute: { ...base.position },
    handleBounds,
  };
}

function seededEdge(i: number): FlowEdge {
  // Chain plus a deterministic cross-link every 3rd edge.
  const source = `n${i}`;
  const target = i % 3 === 0 ? `n${(i + 7) % 1000}` : `n${i + 1}`;
  return {
    id: `e${i}`,
    source,
    target,
    type: i % 2 === 0 ? 'smoothstep' : 'bezier',
    animated: i % 5 === 0,
  };
}

function buildNodes(count: number): Array<FlowNode<{ label: string }>> {
  const out: Array<FlowNode<{ label: string }>> = [];
  for (let i = 0; i < count; i++) out.push(seededNode(i));
  return out;
}

function buildInternalNodes(count: number): Array<InternalNode<{ label: string }>> {
  const out: Array<InternalNode<{ label: string }>> = [];
  for (let i = 0; i < count; i++) out.push(seededInternalNode(i));
  return out;
}

function buildLookup(internals: InternalNode[]): Map<string, InternalNode> {
  const map = new Map<string, InternalNode>();
  for (const n of internals) map.set(n.id, n);
  return map;
}

function buildEdges(count: number): FlowEdge[] {
  const out: FlowEdge[] = [];
  for (let i = 0; i < count; i++) out.push(seededEdge(i));
  return out;
}

// Endpoint pairs feeding the path builders — varied handle sides so the
// smooth-step branch/corner logic is exercised, not just the fast collinear case.
interface EndpointPair {
  sourceX: number;
  sourceY: number;
  sourcePosition: Position;
  targetX: number;
  targetY: number;
  targetPosition: Position;
}

function buildEndpoints(count: number): EndpointPair[] {
  const out: EndpointPair[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      sourceX: (i % 13) * 40,
      sourceY: (i % 17) * 30,
      sourcePosition: SIDES[i % 4]!,
      targetX: 400 + (i % 11) * 50,
      targetY: 200 + (i % 7) * 45,
      targetPosition: SIDES[(i + 2) % 4]!,
    });
  }
  return out;
}

const VP: Viewport = { x: 120, y: -80, zoom: 1.5 };
const ORIGIN = { left: 24, top: 16 };
const CONTAINER = { width: 1280, height: 720 };

// Pointer-move samples (client-space pixels) for screenToFlow/zoom hot paths.
function buildPointers(count: number): XYPosition[] {
  const out: XYPosition[] = [];
  for (let i = 0; i < count; i++)
    out.push({ x: (i * 37) % CONTAINER.width, y: (i * 53) % CONTAINER.height });
  return out;
}

// Pre-built fixture sets at realistic (100) and stress (1000) scale.
const NODES_100 = buildNodes(100);
const NODES_1000 = buildNodes(1000);
const INTERNAL_100 = buildInternalNodes(100);
const INTERNAL_1000 = buildInternalNodes(1000);
const LOOKUP_100 = buildLookup(INTERNAL_100);
const LOOKUP_1000 = buildLookup(INTERNAL_1000);
const EDGES_100 = buildEdges(100);
const EDGES_1000 = buildEdges(1000);
const ENDPOINTS_100 = buildEndpoints(100);
const ENDPOINTS_1000 = buildEndpoints(1000);
const POINTERS_100 = buildPointers(100);
const POINTERS_1000 = buildPointers(1000);

// A `parentId` chain so getNodePositionAbsolute walks ancestors (subflow cost).
const CHAIN_LOOKUP = new Map<string, InternalNode>();
(() => {
  for (let i = 0; i < 64; i++) {
    const n = seededInternalNode(i);
    if (i > 0) n.parentId = `n${i - 1}`;
    CHAIN_LOOKUP.set(n.id, n);
  }
})();
const CHAIN_LEAF = CHAIN_LOOKUP.get('n63')!;

const VISIBLE_RECT: Rect = visibleFlowRect(VP, CONTAINER, 200);
const VISIBLE_NODE_SET_100 = new Set(getVisibleNodeIds(NODES_100, LOOKUP_100, VISIBLE_RECT));
const VISIBLE_NODE_SET_1000 = new Set(getVisibleNodeIds(NODES_1000, LOOKUP_1000, VISIBLE_RECT));

// Marquee rect covering the upper-left quadrant of the laid-out graph.
const MARQUEE: Rect = { x: 0, y: 0, width: 4000, height: 1500 };

// Closest-handle drag origin: drag from n0's source toward a moving pointer.
const DRAG_FROM_HANDLE: HandleBound = INTERNAL_1000[0]!.handleBounds!.source[0]!;

// ── Edge-path math (per-edge, runs for every visible edge every transform) ────

describe('edge-paths — straight', () => {
  bench('100 edges', () => {
    for (let i = 0; i < ENDPOINTS_100.length; i++) getStraightPath(ENDPOINTS_100[i]!);
  });

  bench('1000 edges', () => {
    for (let i = 0; i < ENDPOINTS_1000.length; i++) getStraightPath(ENDPOINTS_1000[i]!);
  });
});

describe('edge-paths — bezier', () => {
  bench('100 edges', () => {
    for (let i = 0; i < ENDPOINTS_100.length; i++) getBezierPath(ENDPOINTS_100[i]!);
  });

  bench('1000 edges', () => {
    for (let i = 0; i < ENDPOINTS_1000.length; i++) getBezierPath(ENDPOINTS_1000[i]!);
  });
});

describe('edge-paths — smoothstep (corner builder)', () => {
  bench('100 edges', () => {
    for (let i = 0; i < ENDPOINTS_100.length; i++) getSmoothStepPath(ENDPOINTS_100[i]!);
  });

  bench('1000 edges', () => {
    for (let i = 0; i < ENDPOINTS_1000.length; i++) getSmoothStepPath(ENDPOINTS_1000[i]!);
  });
});

describe('edge-paths — step (zero-radius smoothstep)', () => {
  bench('100 edges', () => {
    for (let i = 0; i < ENDPOINTS_100.length; i++) getStepPath(ENDPOINTS_100[i]!);
  });

  bench('1000 edges', () => {
    for (let i = 0; i < ENDPOINTS_1000.length; i++) getStepPath(ENDPOINTS_1000[i]!);
  });
});

// ── Pointer / viewport transform math (runs on every pointermove & wheel) ─────

describe('pointer math — screenToFlow', () => {
  bench('100 moves', () => {
    for (let i = 0; i < POINTERS_100.length; i++) screenToFlow(POINTERS_100[i]!, VP, ORIGIN);
  });

  bench('1000 moves', () => {
    for (let i = 0; i < POINTERS_1000.length; i++) screenToFlow(POINTERS_1000[i]!, VP, ORIGIN);
  });
});

describe('pointer math — flowToScreen', () => {
  bench('100 points', () => {
    for (let i = 0; i < POINTERS_100.length; i++) flowToScreen(POINTERS_100[i]!, VP, ORIGIN);
  });

  bench('1000 points', () => {
    for (let i = 0; i < POINTERS_1000.length; i++) flowToScreen(POINTERS_1000[i]!, VP, ORIGIN);
  });
});

describe('pointer math — zoomAtPointer (wheel zoom)', () => {
  bench('100 wheel steps', () => {
    for (let i = 0; i < POINTERS_100.length; i++)
      zoomAtPointer(VP, POINTERS_100[i]!, 1 + (i % 20) / 10);
  });

  bench('1000 wheel steps', () => {
    for (let i = 0; i < POINTERS_1000.length; i++)
      zoomAtPointer(VP, POINTERS_1000[i]!, 1 + (i % 20) / 10);
  });
});

describe('pointer math — snapPoint (drag with snap-to-grid)', () => {
  const grid: [number, number] = [16, 16];

  bench('100 moves', () => {
    for (let i = 0; i < POINTERS_100.length; i++) snapPoint(POINTERS_100[i]!, grid);
  });

  bench('1000 moves', () => {
    for (let i = 0; i < POINTERS_1000.length; i++) snapPoint(POINTERS_1000[i]!, grid);
  });
});

// ── Bounds / fit-view (runs on fitView and minimap recompute) ─────────────────

describe('getNodesBounds', () => {
  bench('100 nodes', () => {
    getNodesBounds(INTERNAL_100);
  });

  bench('1000 nodes', () => {
    getNodesBounds(INTERNAL_1000);
  });
});

describe('fitViewTransform (bounds + fit)', () => {
  const opts = { padding: 0.1, minZoom: 0.2, maxZoom: 2.5 };

  bench('100 nodes', () => {
    fitViewTransform(getNodesBounds(INTERNAL_100), CONTAINER, opts);
  });

  bench('1000 nodes', () => {
    fitViewTransform(getNodesBounds(INTERNAL_1000), CONTAINER, opts);
  });
});

// ── Subflow absolute position (parentId chain walk) ───────────────────────────

describe('getNodePositionAbsolute — parent chain (depth 64)', () => {
  bench('single leaf walk', () => {
    getNodePositionAbsolute(CHAIN_LEAF, CHAIN_LOOKUP);
  });

  bench('64 nodes (all walked)', () => {
    for (const n of CHAIN_LOOKUP.values()) getNodePositionAbsolute(n, CHAIN_LOOKUP);
  });
});

// ── Virtualization / spatial culling (runs every viewport pan/zoom) ──────────

describe('visibleFlowRect + getVisibleNodeIds (node cull)', () => {
  bench('100 nodes', () => {
    const rect = visibleFlowRect(VP, CONTAINER, 200);
    getVisibleNodeIds(NODES_100, LOOKUP_100, rect);
  });

  bench('1000 nodes', () => {
    const rect = visibleFlowRect(VP, CONTAINER, 200);
    getVisibleNodeIds(NODES_1000, LOOKUP_1000, rect);
  });
});

describe('getVisibleEdgeIds (edge cull by visible node set)', () => {
  bench('100 edges', () => {
    getVisibleEdgeIds(EDGES_100, VISIBLE_NODE_SET_100);
  });

  bench('1000 edges', () => {
    getVisibleEdgeIds(EDGES_1000, VISIBLE_NODE_SET_1000);
  });
});

describe('getNodesInsideRect (marquee selection)', () => {
  bench('100 nodes', () => {
    getNodesInsideRect(INTERNAL_100, MARQUEE, 'partial');
  });

  bench('1000 nodes', () => {
    getNodesInsideRect(INTERNAL_1000, MARQUEE, 'partial');
  });
});

// ── Connection snapping (runs every pointermove during a connect drag) ────────

describe('findClosestHandle (connect-drag snapping)', () => {
  bench('100 nodes', () => {
    for (let i = 0; i < POINTERS_100.length; i++)
      findClosestHandle(POINTERS_100[i]!, LOOKUP_100, 'source', 'n0', null, 'strict', 40);
  });

  bench('1000 nodes', () => {
    for (let i = 0; i < POINTERS_100.length; i++)
      findClosestHandle(POINTERS_100[i]!, LOOKUP_1000, 'source', 'n0', null, 'strict', 40);
  });
});

void DRAG_FROM_HANDLE; // referenced for fixture parity; snapping uses lookup handles

// ── Controlled-mode change application (the @nodes-change / @edges-change path) ──

describe('applyNodeChanges (drag → position changes)', () => {
  // A whole-graph position update, as emitted while dragging a multi-selection.
  const changes100: NodeChange[] = NODES_100.map((n, i) => ({
    type: 'position',
    id: n.id,
    position: { x: n.position.x + i, y: n.position.y + i },
  }));
  const changes1000: NodeChange[] = NODES_1000.map((n, i) => ({
    type: 'position',
    id: n.id,
    position: { x: n.position.x + i, y: n.position.y + i },
  }));

  bench('100 position changes', () => {
    applyNodeChanges(changes100, NODES_100);
  });

  bench('1000 position changes', () => {
    applyNodeChanges(changes1000, NODES_1000);
  });
});

describe('applyEdgeChanges (select changes)', () => {
  const changes100: EdgeChange[] = EDGES_100.map(e => ({ type: 'select', id: e.id, selected: true }));
  const changes1000: EdgeChange[] = EDGES_1000.map(e => ({ type: 'select', id: e.id, selected: true }));

  bench('100 select changes', () => {
    applyEdgeChanges(changes100, EDGES_100);
  });

  bench('1000 select changes', () => {
    applyEdgeChanges(changes1000, EDGES_1000);
  });
});

describe('addEdge (dedupe scan on connect)', () => {
  bench('append into 100 edges', () => {
    addEdge({ source: 'n5', target: 'n90', sourceHandle: null, targetHandle: null }, EDGES_100);
  });

  bench('append into 1000 edges', () => {
    addEdge({ source: 'n5', target: 'n900', sourceHandle: null, targetHandle: null }, EDGES_1000);
  });
});

// ── Component: FlowRoot mount + re-render (the realistic end-to-end path) ──────

const nodeSlot = (p: { data?: { label?: string } }) => h('div', { class: 'node-body' }, p.data?.label ?? '');

function mountFlow(nodes: FlowNode[], edges: FlowEdge[]) {
  return mount(FlowRoot, {
    attachTo: document.body,
    props: { defaultNodes: nodes, defaultEdges: edges },
    slots: { 'node-default': nodeSlot },
  });
}

const NODES_50 = buildNodes(50);
const EDGES_50 = buildEdges(50);
const NODES_500 = buildNodes(500);
const EDGES_500 = buildEdges(500);

describe('FlowRoot — mount + unmount', () => {
  bench('50 nodes / 50 edges', () => {
    const w = mountFlow(NODES_50, EDGES_50);
    w.unmount();
  });

  bench('500 nodes / 500 edges', () => {
    const w = mountFlow(NODES_500, EDGES_500);
    w.unmount();
  });
});

describe('FlowRoot — re-render after prop change (viewport pan)', () => {
  bench('50 nodes — viewport setProps', async () => {
    const w = mount(FlowRoot, {
      attachTo: document.body,
      props: { defaultNodes: NODES_50, defaultEdges: EDGES_50, viewport: { x: 0, y: 0, zoom: 1 } },
      slots: { 'node-default': nodeSlot },
    });
    await w.setProps({ viewport: { x: 120, y: -60, zoom: 1.4 } });
    w.unmount();
  });

  bench('500 nodes — nodes setProps (controlled replace)', async () => {
    const w = mount(FlowRoot, {
      attachTo: document.body,
      props: { nodes: NODES_500, edges: EDGES_500 },
      slots: { 'node-default': nodeSlot },
    });
    // Move the first node — a single fresh object, rest keep identity.
    const next = [{ ...NODES_500[0]!, position: { x: 999, y: 999 } }, ...NODES_500.slice(1)];
    await w.setProps({ nodes: next });
    w.unmount();
  });
});
