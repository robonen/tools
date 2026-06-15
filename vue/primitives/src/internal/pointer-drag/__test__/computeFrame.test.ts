import { describe, expect, it } from 'vitest';
import { computeFrame, resolveAxisLock } from '../computeFrame';
import type { DragModifiers, Point } from '../types';

const NO_MOD: DragModifiers = { shift: false, alt: false, ctrl: false, meta: false };
const SHIFT: DragModifiers = { shift: true, alt: false, ctrl: false, meta: false };

const ORIGIN: Point = { x: 0, y: 0 };

describe('resolveAxisLock', () => {
  it('returns the static axis verbatim when not "both"', () => {
    expect(resolveAxisLock('x', true, SHIFT, { x: 5, y: 50 })).toBe('x');
    expect(resolveAxisLock('y', true, SHIFT, { x: 50, y: 5 })).toBe('y');
  });

  it('is "none" for "both" without shift-lock', () => {
    expect(resolveAxisLock('both', false, SHIFT, { x: 5, y: 50 })).toBe('none');
    expect(resolveAxisLock('both', true, NO_MOD, { x: 5, y: 50 })).toBe('none');
  });

  it('picks the dominant axis under shift-lock', () => {
    expect(resolveAxisLock('both', true, SHIFT, { x: 50, y: 5 })).toBe('x');
    expect(resolveAxisLock('both', true, SHIFT, { x: 5, y: 50 })).toBe('y');
  });

  it('resolves an exact tie to "x"', () => {
    expect(resolveAxisLock('both', true, SHIFT, { x: 10, y: 10 })).toBe('x');
    expect(resolveAxisLock('both', true, SHIFT, { x: -10, y: 10 })).toBe('x');
  });
});

describe('computeFrame — axis lock zeroing', () => {
  it('zeros the y component when locked to x', () => {
    const { total } = computeFrame({
      start: ORIGIN,
      last: { x: 30, y: 40 },
      rect: undefined,
      axis: 'x',
      snapGrid: undefined,
      bounds: undefined,
      prevTotal: ORIGIN,
    });
    expect(total).toEqual({ x: 30, y: 0 });
  });

  it('zeros the x component when locked to y', () => {
    const { total } = computeFrame({
      start: ORIGIN,
      last: { x: 30, y: 40 },
      rect: undefined,
      axis: 'y',
      snapGrid: undefined,
      bounds: undefined,
      prevTotal: ORIGIN,
    });
    expect(total).toEqual({ x: 0, y: 40 });
  });

  it('leaves both components free when axis is "none"', () => {
    const { total } = computeFrame({
      start: ORIGIN,
      last: { x: 30, y: 40 },
      rect: undefined,
      axis: 'none',
      snapGrid: undefined,
      bounds: undefined,
      prevTotal: ORIGIN,
    });
    expect(total).toEqual({ x: 30, y: 40 });
  });
});

describe('computeFrame — snap then clamp ordering', () => {
  it('snaps the total to a scalar grid (both axes)', () => {
    const { total } = computeFrame({
      start: ORIGIN,
      last: { x: 23, y: 38 },
      rect: undefined,
      axis: 'none',
      snapGrid: 10,
      bounds: undefined,
      prevTotal: ORIGIN,
    });
    expect(total).toEqual({ x: 20, y: 40 });
  });

  it('snaps each axis independently with a tuple grid', () => {
    const { total } = computeFrame({
      start: ORIGIN,
      last: { x: 23, y: 38 },
      rect: undefined,
      axis: 'none',
      snapGrid: [10, 25],
      bounds: undefined,
      prevTotal: ORIGIN,
    });
    expect(total).toEqual({ x: 20, y: 50 });
  });

  it('a snapped value never lands outside the bounds (clamp runs after snap)', () => {
    // Raw 47 snaps to 50, which exceeds maxX 45 → clamp wins → 45.
    const { total } = computeFrame({
      start: ORIGIN,
      last: { x: 47, y: 0 },
      rect: undefined,
      axis: 'none',
      snapGrid: 10,
      bounds: { maxX: 45 },
      prevTotal: ORIGIN,
    });
    expect(total.x).toBe(45);
    expect(total.x).toBeLessThanOrEqual(45);
  });

  it('clamps the lower bound too', () => {
    const { total } = computeFrame({
      start: ORIGIN,
      last: { x: -100, y: -100 },
      rect: undefined,
      axis: 'none',
      snapGrid: undefined,
      bounds: { minX: -20, minY: -30 },
      prevTotal: ORIGIN,
    });
    expect(total).toEqual({ x: -20, y: -30 });
  });
});

describe('computeFrame — total recomputed from start (no double-count on axis flip)', () => {
  it('an axis-lock flip mid-gesture does not accumulate frame deltas', () => {
    const start: Point = { x: 0, y: 0 };
    const last: Point = { x: 30, y: 40 };

    // Frame 1: locked to x. total = (30, 0).
    const f1 = computeFrame({
      start,
      last,
      rect: undefined,
      axis: 'x',
      snapGrid: undefined,
      bounds: undefined,
      prevTotal: { x: 0, y: 0 },
    });
    expect(f1.total).toEqual({ x: 30, y: 0 });

    // Frame 2: SAME pointer position, but the lock flipped to y. Because the
    // total is recomputed from `start` (not accumulated), it is (0, 40) — NOT
    // (30, 40). The delta reflects the jump off the previous total.
    const f2 = computeFrame({
      start,
      last,
      rect: undefined,
      axis: 'y',
      snapGrid: undefined,
      bounds: undefined,
      prevTotal: f1.total,
    });
    expect(f2.total).toEqual({ x: 0, y: 40 });
    expect(f2.delta).toEqual({ x: -30, y: 40 });
  });

  it('delta is the difference between this total and prevTotal', () => {
    const { delta } = computeFrame({
      start: ORIGIN,
      last: { x: 15, y: 25 },
      rect: undefined,
      axis: 'none',
      snapGrid: undefined,
      bounds: undefined,
      prevTotal: { x: 10, y: 10 },
    });
    expect(delta).toEqual({ x: 5, y: 15 });
  });
});

describe('computeFrame — elementPoint', () => {
  it('is pointer minus rect top-left when a rect is supplied', () => {
    const rect = { left: 100, top: 200 } as DOMRect;
    const { elementPoint } = computeFrame({
      start: ORIGIN,
      last: { x: 130, y: 240 },
      rect,
      axis: 'none',
      snapGrid: undefined,
      bounds: undefined,
      prevTotal: ORIGIN,
    });
    expect(elementPoint).toEqual({ x: 30, y: 40 });
  });

  it('is the origin when no rect is supplied', () => {
    const { elementPoint } = computeFrame({
      start: ORIGIN,
      last: { x: 130, y: 240 },
      rect: undefined,
      axis: 'none',
      snapGrid: undefined,
      bounds: undefined,
      prevTotal: ORIGIN,
    });
    expect(elementPoint).toEqual({ x: 0, y: 0 });
  });
});
