export interface Point { x: number; y: number }
export type Polygon = Point[];

/**
 * Ray-casting point-in-polygon test: returns `true` when `point` lies inside
 * `polygon` (a list of vertices). Shared by the menu and hover-card grace-area
 * logic that decide whether the pointer is still within a "safe" travel region.
 */
export function isPointInPolygon(point: Point, polygon: Polygon): boolean {
  const { x, y } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i]!.x;
    const yi = polygon[i]!.y;
    const xj = polygon[j]!.x;
    const yj = polygon[j]!.y;
    const intersects = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}
