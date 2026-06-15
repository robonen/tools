import { describe, expect, it } from 'vitest';
import type { FlowEdge, FlowNode } from '../types';
import { addEdge, applyEdgeChanges, applyNodeChanges } from '../changes';

const nodes: FlowNode[] = [
  { id: 'a', position: { x: 0, y: 0 } },
  { id: 'b', position: { x: 10, y: 10 } },
];

describe('applyNodeChanges', () => {
  it('returns the same array reference for no changes', () => {
    expect(applyNodeChanges([], nodes)).toBe(nodes);
  });

  it('applies position changes without touching other nodes', () => {
    const out = applyNodeChanges([{ type: 'position', id: 'a', position: { x: 99, y: 99 } }], nodes);
    expect(out[0]!.position).toEqual({ x: 99, y: 99 });
    expect(out[1]).toBe(nodes[1]); // identity preserved for untouched node
  });

  it('removes nodes', () => {
    const out = applyNodeChanges([{ type: 'remove', id: 'a' }], nodes);
    expect(out.map(n => n.id)).toEqual(['b']);
  });

  it('adds a node at an index', () => {
    const out = applyNodeChanges([{ type: 'add', item: { id: 'c', position: { x: 0, y: 0 } }, index: 1 }], nodes);
    expect(out.map(n => n.id)).toEqual(['a', 'c', 'b']);
  });

  it('toggles selection', () => {
    const out = applyNodeChanges([{ type: 'select', id: 'b', selected: true }], nodes);
    expect(out[1]!.selected).toBe(true);
  });

  it('applies dimensions', () => {
    const out = applyNodeChanges([{ type: 'dimensions', id: 'a', dimensions: { width: 120, height: 60 } }], nodes);
    expect(out[0]).toMatchObject({ width: 120, height: 60 });
  });
});

describe('applyEdgeChanges', () => {
  const edges: FlowEdge[] = [{ id: 'e1', source: 'a', target: 'b' }];
  it('removes and selects edges', () => {
    expect(applyEdgeChanges([{ type: 'remove', id: 'e1' }], edges)).toHaveLength(0);
    expect(applyEdgeChanges([{ type: 'select', id: 'e1', selected: true }], edges)[0]!.selected).toBe(true);
  });
});

describe('addEdge', () => {
  const edges: FlowEdge[] = [{ id: 'xy-edge__as-bt', source: 'a', target: 'b', sourceHandle: 's', targetHandle: 't' }];
  it('appends a connection as an edge', () => {
    const out = addEdge({ source: 'a', target: 'c', sourceHandle: null, targetHandle: null }, edges);
    expect(out).toHaveLength(2);
    expect(out[1]!.source).toBe('a');
    expect(out[1]!.target).toBe('c');
  });

  it('skips duplicates by id', () => {
    const out = addEdge({ source: 'a', target: 'b', sourceHandle: 's', targetHandle: 't' }, edges);
    expect(out).toBe(edges);
  });
});
