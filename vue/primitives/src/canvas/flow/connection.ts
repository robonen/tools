import type {
  Connection,
  ConnectionMode,
  FlowEdge,
  HandleBound,
  HandleType,
  InternalNode,
  IsValidConnection,
  XYPosition,
} from './types';
import { getAbsoluteHandlePoint } from './utils';

/** A hovered drop candidate during a connection drag. */
export interface ConnectionTarget {
  nodeId: string;
  handle: HandleBound;
}

/**
 * Closest handle to `point` (flow space) within `radius`, eligible as a drop
 * target given the drag origin. In `strict` mode only the opposite handle type
 * on a *different* node qualifies; in `loose` mode any handle but the origin's
 * own does. Returns `null` when nothing is in range.
 */
export function findClosestHandle(
  point: XYPosition,
  nodeLookup: Map<string, InternalNode>,
  fromType: HandleType,
  fromNodeId: string,
  fromHandleId: string | null,
  mode: ConnectionMode,
  radius: number,
): ConnectionTarget | null {
  const types: HandleType[] = mode === 'loose'
    ? ['source', 'target']
    : [fromType === 'source' ? 'target' : 'source'];

  let best: ConnectionTarget | null = null;
  let bestDist = radius;

  for (const node of nodeLookup.values()) {
    if (node.hidden || !node.handleBounds) continue;
    if (mode === 'strict' && node.id === fromNodeId) continue;

    for (const type of types) {
      for (const handle of node.handleBounds[type]) {
        if (node.id === fromNodeId && handle.id === fromHandleId && handle.type === fromType) continue;
        const p = getAbsoluteHandlePoint(node.positionAbsolute, handle);
        const dist = Math.hypot(p.x - point.x, p.y - point.y);
        if (dist <= bestDist) {
          bestDist = dist;
          best = { nodeId: node.id, handle };
        }
      }
    }
  }

  return best;
}

/** Orient a connection so `source` is always the source-typed end. */
export function buildConnection(
  fromType: HandleType,
  fromNodeId: string,
  fromHandle: HandleBound,
  target: ConnectionTarget,
): Connection {
  return fromType === 'source'
    ? { source: fromNodeId, target: target.nodeId, sourceHandle: fromHandle.id, targetHandle: target.handle.id }
    : { source: target.nodeId, target: fromNodeId, sourceHandle: target.handle.id, targetHandle: fromHandle.id };
}

/**
 * Default connection gate: rejects self-loops and duplicates, then defers to a
 * consumer-supplied `custom` predicate.
 */
export function isValidConnection(
  conn: Connection,
  edges: Iterable<FlowEdge>,
  custom?: IsValidConnection,
): boolean {
  if (conn.source === conn.target) return false;

  for (const e of edges) {
    if (
      e.source === conn.source
      && e.target === conn.target
      && (e.sourceHandle ?? null) === conn.sourceHandle
      && (e.targetHandle ?? null) === conn.targetHandle
    ) return false;
  }

  if (custom && !custom(conn)) return false;
  return true;
}

/** Deterministic edge id from a connection's endpoints. */
export function connectionToEdgeId(conn: Connection): string {
  return `xy-edge__${conn.source}${conn.sourceHandle ?? ''}-${conn.target}${conn.targetHandle ?? ''}`;
}
