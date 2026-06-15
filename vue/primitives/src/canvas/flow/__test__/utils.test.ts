import { describe, expect, it } from 'vitest';
import type { InternalNode, Viewport } from '../types';
import {
  fitViewTransform,
  flowToScreen,
  getAbsoluteHandlePoint,
  getNodePositionAbsolute,
  getNodesBounds,
  getNodesInsideRect,
  nodeInRect,
  rectContains,
  rectsIntersect,
  screenToFlow,
  snapPoint,
  visibleFlowRect,
  zoomAtPointer,
} from '../utils';

const ORIGIN = { left: 0, top: 0 };

function node(id: string, x: number, y: number, w = 100, h = 50, parentId?: string): InternalNode {
  return {
    id,
    position: { x, y },
    parentId,
    measured: { width: w, height: h },
    positionAbsolute: { x, y },
    handleBounds: null,
  };
}

describe('screenToFlow / flowToScreen', () => {
  it('are exact inverses at zoom 1', () => {
    const vp: Viewport = { x: 30, y: -10, zoom: 1 };
    const p = { x: 123, y: 456 };
    const flow = screenToFlow(p, vp, ORIGIN);
    expect(flowToScreen(flow, vp, ORIGIN)).toEqual(p);
  });

  it('are exact inverses at zoom != 1 and with a pane origin', () => {
    const vp: Viewport = { x: 200, y: 80, zoom: 1.5 };
    const origin = { left: 64, top: 40 };
    const p = { x: 512, y: 300 };
    const flow = screenToFlow(p, vp, origin);
    const back = flowToScreen(flow, vp, origin);
    expect(back.x).toBeCloseTo(p.x, 6);
    expect(back.y).toBeCloseTo(p.y, 6);
  });

  it('divides out zoom and translation', () => {
    const vp: Viewport = { x: 100, y: 50, zoom: 2 };
    expect(screenToFlow({ x: 100, y: 50 }, vp, ORIGIN)).toEqual({ x: 0, y: 0 });
    expect(screenToFlow({ x: 300, y: 250 }, vp, ORIGIN)).toEqual({ x: 100, y: 100 });
  });
});

describe('zoomAtPointer', () => {
  it('keeps the pointer anchored while zooming', () => {
    const vp: Viewport = { x: 0, y: 0, zoom: 1 };
    const pointer = { x: 400, y: 300 };
    const next = zoomAtPointer(vp, pointer, 2);
    // The flow point under the pointer must be identical before and after.
    const before = screenToFlow(pointer, vp, ORIGIN);
    const after = screenToFlow(pointer, next, ORIGIN);
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
    expect(next.zoom).toBe(2);
  });
});

describe('snapPoint', () => {
  it('rounds to the nearest grid intersection', () => {
    expect(snapPoint({ x: 23, y: 47 }, [10, 10])).toEqual({ x: 20, y: 50 });
    expect(snapPoint({ x: 26, y: 41 }, [10, 20])).toEqual({ x: 30, y: 40 });
  });

  it('passes through on a zero grid axis', () => {
    expect(snapPoint({ x: 7, y: 9 }, [0, 0])).toEqual({ x: 7, y: 9 });
  });
});

describe('getNodesBounds', () => {
  it('encloses all nodes', () => {
    const bounds = getNodesBounds([node('a', 0, 0, 100, 50), node('b', 200, 100, 50, 50)]);
    expect(bounds).toEqual({ x: 0, y: 0, width: 250, height: 150 });
  });

  it('returns a zero rect when empty', () => {
    expect(getNodesBounds([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });
});

describe('fitViewTransform', () => {
  it('centres known bounds in the container', () => {
    const bounds = { x: 0, y: 0, width: 100, height: 100 };
    const vp = fitViewTransform(bounds, { width: 400, height: 400 }, { padding: 0, minZoom: 0.1, maxZoom: 4 });
    expect(vp.zoom).toBeCloseTo(4, 6);
    // center of bounds (50,50) maps to container center (200,200)
    const center = flowToScreen({ x: 50, y: 50 }, vp, ORIGIN);
    expect(center.x).toBeCloseTo(200, 6);
    expect(center.y).toBeCloseTo(200, 6);
  });

  it('respects maxZoom', () => {
    const vp = fitViewTransform({ x: 0, y: 0, width: 10, height: 10 }, { width: 1000, height: 1000 }, { padding: 0, minZoom: 0.5, maxZoom: 2 });
    expect(vp.zoom).toBe(2);
  });
});

describe('rect predicates', () => {
  const a = { x: 0, y: 0, width: 100, height: 100 };
  it('detects intersection and containment', () => {
    expect(rectsIntersect(a, { x: 50, y: 50, width: 100, height: 100 })).toBe(true);
    expect(rectsIntersect(a, { x: 200, y: 0, width: 10, height: 10 })).toBe(false);
    expect(rectContains(a, { x: 10, y: 10, width: 20, height: 20 })).toBe(true);
    expect(rectContains(a, { x: 90, y: 90, width: 20, height: 20 })).toBe(false);
  });

  it('nodeInRect honours partial vs full', () => {
    const n = node('n', 80, 80, 40, 40); // overlaps a but not contained
    expect(nodeInRect(n, a, 'partial')).toBe(true);
    expect(nodeInRect(n, a, 'full')).toBe(false);
  });

  it('getNodesInsideRect collects ids and skips hidden', () => {
    const hidden = { ...node('h', 10, 10), hidden: true };
    const ids = getNodesInsideRect([node('a', 10, 10), node('b', 500, 500), hidden], a, 'partial');
    expect(ids).toEqual(['a']);
  });
});

describe('visibleFlowRect', () => {
  it('expands the visible area by the buffer in flow space', () => {
    const rect = visibleFlowRect({ x: 0, y: 0, zoom: 1 }, { width: 800, height: 600 }, 100);
    expect(rect).toEqual({ x: -100, y: -100, width: 1000, height: 800 });
  });
});

describe('getNodePositionAbsolute', () => {
  it('sums the parent chain', () => {
    const lookup = new Map<string, InternalNode>();
    lookup.set('parent', node('parent', 100, 100));
    lookup.set('child', node('child', 10, 20, 100, 50, 'parent'));
    const abs = getNodePositionAbsolute(lookup.get('child')!, lookup);
    expect(abs).toEqual({ x: 110, y: 120 });
  });
});

describe('getAbsoluteHandlePoint', () => {
  it('returns the handle centre in absolute flow coords', () => {
    const point = getAbsoluteHandlePoint({ x: 100, y: 100 }, { id: null, type: 'source', position: 'right', x: 100, y: 25, width: 10, height: 10 });
    expect(point).toEqual({ x: 205, y: 130 });
  });
});
