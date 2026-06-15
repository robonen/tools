import type { Point } from './types';

/**
 * Build the SVG path `d` for a single cubic bezier ("M x,y C c1 c2 p3").
 * Domain-agnostic generalization of flow's bezier path (no handle-side logic).
 */
export function buildBezierPath(p0: Point, c1: Point, c2: Point, p3: Point): string {
  return `M ${p0.x},${p0.y} C ${c1.x},${c1.y} ${c2.x},${c2.y} ${p3.x},${p3.y}`;
}

/**
 * Sample a `y = f(x)` curve into a `size`-length lookup table across `[x0, x1]`
 * (defaults `0..1`). Useful for color/levels/gamma application.
 */
export function toLUT(fn: (x: number) => number, size: number, x0 = 0, x1 = 1): number[] {
  const count = Math.max(1, Math.floor(size));
  const lut: number[] = [];
  if (count === 1) {
    lut.push(fn(x0));
    return lut;
  }
  for (let i = 0; i < count; i++) {
    const x = x0 + ((x1 - x0) * i) / (count - 1);
    lut.push(fn(x));
  }
  return lut;
}
