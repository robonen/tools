import type { FlowEdge, FlowNode, InternalNode, Rect } from './types';
import { rectsIntersect } from './utils';

/**
 * Ids of nodes whose box intersects the (buffered) visible `rect`. Unmeasured
 * nodes are treated as points at their absolute position, so they are kept while
 * near the viewport rather than flickering out before first measure.
 */
export function getVisibleNodeIds(
  nodes: Iterable<FlowNode>,
  nodeLookup: Map<string, InternalNode>,
  rect: Rect,
): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    if (node.hidden) continue;
    const internal = nodeLookup.get(node.id);
    if (!internal) {
      ids.push(node.id);
      continue;
    }
    const box: Rect = {
      x: internal.positionAbsolute.x,
      y: internal.positionAbsolute.y,
      width: internal.measured.width,
      height: internal.measured.height,
    };
    if (rectsIntersect(rect, box)) ids.push(node.id);
  }
  return ids;
}

/**
 * Ids of edges with at least one endpoint among the visible nodes. Cheap and
 * good enough: short edges between two off-screen nodes are culled, which is the
 * desired behaviour for large graphs.
 */
export function getVisibleEdgeIds(edges: Iterable<FlowEdge>, visibleNodes: Set<string>): string[] {
  const ids: string[] = [];
  for (const edge of edges) {
    if (edge.hidden) continue;
    if (visibleNodes.has(edge.source) || visibleNodes.has(edge.target)) ids.push(edge.id);
  }
  return ids;
}
