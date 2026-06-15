import { describe, expect, it } from 'vitest';
import type { FlowEdge, HandleBound, InternalNode } from '../types';
import { buildConnection, connectionToEdgeId, findClosestHandle, isValidConnection } from '../connection';

function handle(id: string | null, type: 'source' | 'target', x: number, y: number): HandleBound {
  return { id, type, position: type === 'source' ? 'right' : 'left', x, y, width: 0, height: 0 };
}

function node(id: string, x: number, y: number, handles: HandleBound[]): InternalNode {
  const bounds = { source: handles.filter(h => h.type === 'source'), target: handles.filter(h => h.type === 'target') };
  return {
    id,
    position: { x, y },
    measured: { width: 100, height: 40 },
    positionAbsolute: { x, y },
    handleBounds: bounds,
  };
}

function lookup(...nodes: InternalNode[]): Map<string, InternalNode> {
  return new Map(nodes.map(n => [n.id, n]));
}

describe('findClosestHandle', () => {
  const map = lookup(
    node('a', 0, 0, [handle('s', 'source', 100, 20)]),
    node('b', 200, 0, [handle('t', 'target', 0, 20)]),
  );

  it('finds the opposite-type handle within radius (strict)', () => {
    // dragging from a's source; target b's target at (200,20)
    const hit = findClosestHandle({ x: 205, y: 22 }, map, 'source', 'a', 's', 'strict', 30);
    expect(hit?.nodeId).toBe('b');
    expect(hit?.handle.id).toBe('t');
  });

  it('returns null when nothing is within radius', () => {
    expect(findClosestHandle({ x: 500, y: 500 }, map, 'source', 'a', 's', 'strict', 30)).toBeNull();
  });

  it('excludes the same node in strict mode', () => {
    const self = lookup(node('a', 0, 0, [handle('s', 'source', 100, 20), handle('t', 'target', 0, 20)]));
    expect(findClosestHandle({ x: 0, y: 20 }, self, 'source', 'a', 's', 'strict', 30)).toBeNull();
  });

  it('allows other handle types on any node in loose mode', () => {
    const m = lookup(node('a', 0, 0, [handle('s', 'source', 100, 20)]), node('b', 110, 20, [handle('s2', 'source', 0, 0)]));
    const hit = findClosestHandle({ x: 110, y: 20 }, m, 'source', 'a', 's', 'loose', 30);
    expect(hit?.nodeId).toBe('b');
  });
});

describe('isValidConnection', () => {
  const edges: FlowEdge[] = [{ id: 'e', source: 'a', target: 'b', sourceHandle: 's', targetHandle: 't' }];

  it('rejects self-connections', () => {
    expect(isValidConnection({ source: 'a', target: 'a', sourceHandle: null, targetHandle: null }, [])).toBe(false);
  });

  it('rejects duplicate edges', () => {
    expect(isValidConnection({ source: 'a', target: 'b', sourceHandle: 's', targetHandle: 't' }, edges)).toBe(false);
  });

  it('accepts a new distinct connection', () => {
    expect(isValidConnection({ source: 'a', target: 'c', sourceHandle: null, targetHandle: null }, edges)).toBe(true);
  });

  it('defers to a custom predicate', () => {
    const conn = { source: 'a', target: 'c', sourceHandle: null, targetHandle: null };
    expect(isValidConnection(conn, edges, () => false)).toBe(false);
    expect(isValidConnection(conn, edges, c => c.target === 'c')).toBe(true);
  });
});

describe('buildConnection', () => {
  const target = { nodeId: 'b', handle: handle('t', 'target', 0, 0), point: { x: 0, y: 0 } };

  it('keeps source/target orientation when dragging from a source', () => {
    const conn = buildConnection('source', 'a', handle('s', 'source', 0, 0), target);
    expect(conn).toEqual({ source: 'a', target: 'b', sourceHandle: 's', targetHandle: 't' });
  });

  it('inverts orientation when dragging from a target', () => {
    const src = { nodeId: 'b', handle: handle('s', 'source', 0, 0), point: { x: 0, y: 0 } };
    const conn = buildConnection('target', 'a', handle('t', 'target', 0, 0), src);
    expect(conn).toEqual({ source: 'b', target: 'a', sourceHandle: 's', targetHandle: 't' });
  });
});

describe('connectionToEdgeId', () => {
  it('is deterministic', () => {
    const conn = { source: 'a', target: 'b', sourceHandle: 's', targetHandle: 't' };
    expect(connectionToEdgeId(conn)).toBe(connectionToEdgeId({ ...conn }));
  });
});
