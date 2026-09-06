/** One block's vertical extent, in the coordinate space the sensor measured in. */
export interface BlockRow {
  readonly id: string;
  readonly top: number;
  readonly bottom: number;
}

/**
 * The boundary a vertical position points at: `k` means "before row k", and
 * `rows.length` is the end. Rows are in document order, so the answer is a
 * binary search over their midpoints — no hit-testing, no DOM.
 */
export function dropIndexAt(rows: readonly BlockRow[], y: number): number {
  let low = 0;
  let high = rows.length;

  while (low < high) {
    const mid = (low + high) >>> 1;
    const row = rows[mid]!;

    if (y < (row.top + row.bottom) / 2)
      high = mid;
    else
      low = mid + 1;
  }

  return low;
}

/** The vertical position of a boundary: the top of the row after it, or the bottom of the last row. */
export function boundaryY(rows: readonly BlockRow[], index: number): number | null {
  if (rows.length === 0)
    return null;
  return index < rows.length ? rows[index]!.top : rows[rows.length - 1]!.bottom;
}

/** Pixel distance between two points. */
export function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

/**
 * How fast to scroll when the pointer is within `edge` of a container edge:
 * 0 outside the zone, ramping to `max` px per frame at the edge itself.
 * Negative means up.
 */
export function autoscrollSpeed(pointerY: number, top: number, bottom: number, edge: number, max: number): number {
  if (pointerY < top + edge)
    return -max * Math.min(1, (top + edge - pointerY) / edge);
  if (pointerY > bottom - edge)
    return max * Math.min(1, (pointerY - (bottom - edge)) / edge);
  return 0;
}
