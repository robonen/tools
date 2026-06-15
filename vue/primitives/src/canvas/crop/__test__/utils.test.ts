import { describe, expect, it } from 'vitest';
import type { CropBounds, CropRect } from '../utils';
import {
  createRect,
  fitRectToRatio,
  minBox,
  moveRect,
  normalizeRect,
  resizeRect,
  resolveAspectRatio,
} from '../utils';

const UNIT: CropBounds = { width: 1, height: 1 };

function opts(over: Partial<{ aspectRatio: number | null; minWidth: number; minHeight: number; bounds: CropBounds; constrain: boolean }> = {}) {
  return {
    aspectRatio: null,
    minWidth: 0,
    minHeight: 0,
    bounds: UNIT,
    constrain: true,
    ...over,
  };
}

describe('minBox — min + ratio conflict', () => {
  it('returns the raw mins with no ratio', () => {
    expect(minBox(0.2, 0.3, null)).toEqual({ width: 0.2, height: 0.3 });
  });

  it('grows the binding dimension so BOTH mins are satisfied (ratio > mins imply width grows)', () => {
    // ratio 2 (w = 2h). minWidth 0.2, minHeight 0.3 → height-min forces w >= 0.6.
    const box = minBox(0.2, 0.3, 2);
    expect(box.width).toBeCloseTo(0.6, 6);
    expect(box.height).toBeCloseTo(0.3, 6);
    // Ratio is exactly held.
    expect(box.width / box.height).toBeCloseTo(2, 6);
  });

  it('picks width-min as binding when it forces the larger box', () => {
    // ratio 2. minWidth 0.8 dominates (0.8 > 2*0.3=0.6).
    const box = minBox(0.8, 0.3, 2);
    expect(box.width).toBeCloseTo(0.8, 6);
    expect(box.height).toBeCloseTo(0.4, 6);
    expect(box.width / box.height).toBeCloseTo(2, 6);
  });
});

describe('moveRect', () => {
  const rect: CropRect = { x: 0.2, y: 0.2, width: 0.4, height: 0.4 };

  it('translates without changing size', () => {
    const out = moveRect(rect, 0.1, -0.05, UNIT, false);
    expect(out.x).toBeCloseTo(0.3, 6);
    expect(out.y).toBeCloseTo(0.15, 6);
    expect(out.width).toBeCloseTo(0.4, 6);
    expect(out.height).toBeCloseTo(0.4, 6);
  });

  it('clamps within bounds when constrained', () => {
    const out = moveRect(rect, 1, 1, UNIT, true);
    // Can't go past 1 - width.
    expect(out.x).toBeCloseTo(0.6, 6);
    expect(out.y).toBeCloseTo(0.6, 6);
    expect(out.width).toBeCloseTo(0.4, 6);
  });
});

describe('resizeRect — free resize keeps the opposite edge fixed', () => {
  const rect: CropRect = { x: 0.2, y: 0.2, width: 0.4, height: 0.4 }; // right=0.6, bottom=0.6

  it('drags the left edge, right edge stays put', () => {
    const out = resizeRect(rect, 'left', 0.1, 0.2, opts());
    expect(out.x).toBeCloseTo(0.1, 6);
    expect(out.x + out.width).toBeCloseTo(0.6, 6); // right fixed
  });

  it('drags the bottom-right corner, top-left stays put', () => {
    const out = resizeRect(rect, 'bottom-right', 0.9, 0.8, opts());
    expect(out.x).toBeCloseTo(0.2, 6); // left fixed
    expect(out.y).toBeCloseTo(0.2, 6); // top fixed
    expect(out.x + out.width).toBeCloseTo(0.9, 6);
    expect(out.y + out.height).toBeCloseTo(0.8, 6);
  });
});

describe('resizeRect — aspect ratio', () => {
  const rect: CropRect = { x: 0.2, y: 0.2, width: 0.2, height: 0.2 };

  it('keeps the ratio on a corner drag', () => {
    const out = resizeRect(rect, 'bottom-right', 0.8, 0.5, opts({ aspectRatio: 1 }));
    expect(out.width / out.height).toBeCloseTo(1, 6);
  });

  it('adjusts the paired dimension on an edge drag (right → height follows)', () => {
    const out = resizeRect(rect, 'right', 0.6, 0.3, opts({ aspectRatio: 2 }));
    expect(out.width / out.height).toBeCloseTo(2, 6);
  });
});

describe('resizeRect — constrain clamps into bounds while holding ratio', () => {
  it('a corner drag past the media edge clamps and preserves the ratio', () => {
    const rect: CropRect = { x: 0.5, y: 0.5, width: 0.2, height: 0.2 };
    const out = resizeRect(rect, 'bottom-right', 2, 2, opts({ aspectRatio: 1, constrain: true }));
    expect(out.x + out.width).toBeLessThanOrEqual(1 + 1e-9);
    expect(out.y + out.height).toBeLessThanOrEqual(1 + 1e-9);
    expect(out.width / out.height).toBeCloseTo(1, 6);
  });

  it('free corner drag past the edge clamps the dimension', () => {
    const rect: CropRect = { x: 0.2, y: 0.2, width: 0.2, height: 0.2 };
    const out = resizeRect(rect, 'bottom-right', 2, 2, opts({ constrain: true }));
    expect(out.x + out.width).toBeLessThanOrEqual(1 + 1e-9);
    expect(out.y + out.height).toBeLessThanOrEqual(1 + 1e-9);
  });

  it('never shrinks below the combined min box', () => {
    const rect: CropRect = { x: 0.4, y: 0.4, width: 0.2, height: 0.2 };
    const out = resizeRect(rect, 'top-left', 0.59, 0.59, opts({ minWidth: 0.1, minHeight: 0.1 }));
    expect(out.width).toBeGreaterThanOrEqual(0.1 - 1e-9);
    expect(out.height).toBeGreaterThanOrEqual(0.1 - 1e-9);
  });
});

describe('fitRectToRatio', () => {
  it('re-fits a free rect to the ratio about its centre and clamps into bounds', () => {
    const rect: CropRect = { x: 0.1, y: 0.1, width: 0.8, height: 0.4 };
    const out = fitRectToRatio(rect, 1, UNIT, 0, 0);
    expect(out.width / out.height).toBeCloseTo(1, 6);
    expect(out.x).toBeGreaterThanOrEqual(-1e-9);
    expect(out.y).toBeGreaterThanOrEqual(-1e-9);
    expect(out.x + out.width).toBeLessThanOrEqual(1 + 1e-9);
    expect(out.y + out.height).toBeLessThanOrEqual(1 + 1e-9);
  });
});

describe('createRect — draw from empty', () => {
  it('draws a rect from the pointerdown origin to the current point', () => {
    const out = createRect({ x: 0.2, y: 0.3 }, { x: 0.6, y: 0.7 }, opts());
    expect(out.x).toBeCloseTo(0.2, 6);
    expect(out.y).toBeCloseTo(0.3, 6);
    expect(out.width).toBeCloseTo(0.4, 6);
    expect(out.height).toBeCloseTo(0.4, 6);
  });

  it('normalises a backwards drag (point above/left of origin)', () => {
    const out = createRect({ x: 0.6, y: 0.7 }, { x: 0.2, y: 0.3 }, opts());
    expect(out.x).toBeCloseTo(0.2, 6);
    expect(out.y).toBeCloseTo(0.3, 6);
    expect(out.width).toBeCloseTo(0.4, 6);
    expect(out.height).toBeCloseTo(0.4, 6);
  });
});

describe('normalizeRect', () => {
  it('clamps an out-of-bounds rect inside the media', () => {
    const out = normalizeRect({ x: 0.8, y: 0.8, width: 0.5, height: 0.5 }, opts({ constrain: true }));
    expect(out.x + out.width).toBeLessThanOrEqual(1 + 1e-9);
    expect(out.y + out.height).toBeLessThanOrEqual(1 + 1e-9);
  });

  it('enforces the min size', () => {
    const out = normalizeRect({ x: 0.4, y: 0.4, width: 0.01, height: 0.01 }, opts({ minWidth: 0.1, minHeight: 0.1 }));
    expect(out.width).toBeGreaterThanOrEqual(0.1 - 1e-9);
    expect(out.height).toBeGreaterThanOrEqual(0.1 - 1e-9);
  });
});

describe('resolveAspectRatio', () => {
  it('returns the ratio unchanged in pixel units', () => {
    expect(resolveAspectRatio(2, 'pixels', 800, 600)).toBe(2);
  });

  it('corrects for the media pixel-aspect in normalized units', () => {
    // visual 1:1 on a 2:1 media → normalized w/h = 1 * (h/w) = 0.5.
    expect(resolveAspectRatio(1, 'normalized', 2, 1)).toBeCloseTo(0.5, 6);
  });

  it('passes through null', () => {
    expect(resolveAspectRatio(null, 'normalized', 100, 100)).toBeNull();
  });
});
