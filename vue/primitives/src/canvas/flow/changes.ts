import type { Connection, EdgeChange, FlowEdge, FlowNode, NodeChange } from './types';
import { connectionToEdgeId } from './connection';

/**
 * Apply a batch of node changes to a nodes array, returning a NEW array (and new
 * objects only for changed nodes — untouched nodes keep identity so per-node
 * `v-memo` stays effective). The React-Flow-style helper for controlled mode:
 * bind `@nodes-change` and call this in your handler.
 */
export function applyNodeChanges<Data = unknown>(changes: Array<NodeChange<Data>>, nodes: Array<FlowNode<Data>>): Array<FlowNode<Data>> {
  if (changes.length === 0) return nodes;

  const byId = new Map(nodes.map(n => [n.id, n]));
  const removed = new Set<string>();
  const added: Array<{ item: FlowNode<Data>; index?: number }> = [];

  for (const c of changes) {
    switch (c.type) {
      case 'position': {
        const n = byId.get(c.id);
        if (n && c.position) byId.set(c.id, { ...n, position: c.position });
        break;
      }
      case 'dimensions': {
        const n = byId.get(c.id);
        if (n) byId.set(c.id, { ...n, width: c.dimensions.width, height: c.dimensions.height });
        break;
      }
      case 'select': {
        const n = byId.get(c.id);
        if (n) byId.set(c.id, { ...n, selected: c.selected });
        break;
      }
      case 'remove':
        removed.add(c.id);
        break;
      case 'add':
        added.push({ item: c.item, index: c.index });
        break;
      case 'replace':
        if (byId.has(c.id)) byId.set(c.id, c.item);
        break;
    }
  }

  const result = nodes
    .filter(n => !removed.has(n.id))
    .map(n => byId.get(n.id) ?? n);

  for (const { item, index } of added) {
    if (index === undefined || index >= result.length) result.push(item);
    else result.splice(index, 0, item);
  }

  return result;
}

/** Apply a batch of edge changes to an edges array, returning a NEW array. */
export function applyEdgeChanges<Data = unknown>(changes: Array<EdgeChange<Data>>, edges: Array<FlowEdge<Data>>): Array<FlowEdge<Data>> {
  if (changes.length === 0) return edges;

  const byId = new Map(edges.map(e => [e.id, e]));
  const removed = new Set<string>();
  const added: Array<{ item: FlowEdge<Data>; index?: number }> = [];

  for (const c of changes) {
    switch (c.type) {
      case 'select': {
        const e = byId.get(c.id);
        if (e) byId.set(c.id, { ...e, selected: c.selected });
        break;
      }
      case 'remove':
        removed.add(c.id);
        break;
      case 'add':
        added.push({ item: c.item, index: c.index });
        break;
      case 'replace':
        if (byId.has(c.id)) byId.set(c.id, c.item);
        break;
    }
  }

  const result = edges
    .filter(e => !removed.has(e.id))
    .map(e => byId.get(e.id) ?? e);

  for (const { item, index } of added) {
    if (index === undefined || index >= result.length) result.push(item);
    else result.splice(index, 0, item);
  }

  return result;
}

/**
 * Append an edge for a connection (or a full edge) to an edges array, skipping
 * duplicates. Returns the same array when the edge already exists.
 */
export function addEdge<Data = unknown>(
  edgeOrConnection: Connection | FlowEdge<Data>,
  edges: Array<FlowEdge<Data>>,
): Array<FlowEdge<Data>> {
  const edge: FlowEdge<Data> = 'id' in edgeOrConnection
    ? edgeOrConnection
    : { id: connectionToEdgeId(edgeOrConnection), ...edgeOrConnection } as FlowEdge<Data>;

  if (edges.some(e => e.id === edge.id)) return edges;
  return [...edges, edge];
}
