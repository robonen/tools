import { describe, expect, it } from 'vitest';
import {
  getBezierPath,
  getEdgeCenter,
  getMarkerId,
  getSmoothStepPath,
  getStepPath,
  getStraightPath,
} from '../edge-paths';

describe('getStraightPath', () => {
  it('draws a line and reports the midpoint', () => {
    const [path, labelX, labelY, ox, oy] = getStraightPath({ sourceX: 0, sourceY: 0, targetX: 100, targetY: 50 });
    expect(path).toBe('M 0,0 L 100,50');
    expect([labelX, labelY]).toEqual([50, 25]);
    expect([ox, oy]).toEqual([50, 25]);
  });
});

describe('getEdgeCenter', () => {
  it('returns centre and absolute offset', () => {
    expect(getEdgeCenter({ sourceX: 0, sourceY: 0, targetX: 40, targetY: -20 })).toEqual([20, -10, 20, 10]);
  });
});

describe('getBezierPath', () => {
  it('produces a cubic with control points', () => {
    const [path, labelX, labelY] = getBezierPath({ sourceX: 0, sourceY: 0, sourcePosition: 'bottom', targetX: 0, targetY: 200, targetPosition: 'top' });
    expect(path.startsWith('M 0,0 C')).toBe(true);
    expect(Number.isFinite(labelX)).toBe(true);
    expect(labelY).toBeCloseTo(100, 6);
  });

  it('does not collapse to NaN when the target is behind the source (sqrt fallback)', () => {
    const [path] = getBezierPath({ sourceX: 0, sourceY: 0, sourcePosition: 'bottom', targetX: 0, targetY: -200, targetPosition: 'top' });
    expect(path).not.toContain('NaN');
  });
});

describe('getSmoothStepPath', () => {
  it('produces an orthogonal path with rounded corners', () => {
    const [path, labelX, labelY] = getSmoothStepPath({ sourceX: 0, sourceY: 0, sourcePosition: 'bottom', targetX: 200, targetY: 200, targetPosition: 'top' });
    expect(path.startsWith('M ')).toBe(true);
    expect(path).toContain('Q'); // at least one rounded corner
    expect(path).not.toContain('NaN');
    expect(Number.isFinite(labelX) && Number.isFinite(labelY)).toBe(true);
  });

  it('clamps the corner radius and never emits NaN for close handles', () => {
    const [path] = getSmoothStepPath({ sourceX: 0, sourceY: 0, sourcePosition: 'right', targetX: 5, targetY: 5, targetPosition: 'left', borderRadius: 100 });
    expect(path).not.toContain('NaN');
  });
});

describe('getStepPath', () => {
  it('is a smooth-step path with zero radius (no curve)', () => {
    const [path] = getStepPath({ sourceX: 0, sourceY: 0, sourcePosition: 'bottom', targetX: 200, targetY: 200, targetPosition: 'top' });
    expect(path).not.toContain('NaN');
    expect(path.startsWith('M ')).toBe(true);
  });
});

describe('getMarkerId', () => {
  it('is deterministic for identical descriptors (dedupe key)', () => {
    const a = getMarkerId({ type: 'arrowclosed', color: '#222' }, 'flow1');
    const b = getMarkerId({ type: 'arrowclosed', color: '#222' }, 'flow1');
    expect(a).toBe(b);
  });

  it('differs for different markers or flows', () => {
    expect(getMarkerId({ type: 'arrow' }, 'flow1')).not.toBe(getMarkerId({ type: 'arrowclosed' }, 'flow1'));
    expect(getMarkerId({ type: 'arrow' }, 'flow1')).not.toBe(getMarkerId({ type: 'arrow' }, 'flow2'));
  });
});
