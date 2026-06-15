import type { EdgeMarker, Position, XYPosition } from './types';

/**
 * Result of every path builder: the SVG `d` string plus the label anchor
 * (`labelX`/`labelY`) and its offset from the source (`offsetX`/`offsetY`),
 * used to place edge labels and badges.
 */
export type PathResult = [path: string, labelX: number, labelY: number, offsetX: number, offsetY: number];

/** Geometric centre of two points + the |centre − source| offset. */
export function getEdgeCenter(p: {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}): [centerX: number, centerY: number, offsetX: number, offsetY: number] {
  const centerX = (p.sourceX + p.targetX) / 2;
  const centerY = (p.sourceY + p.targetY) / 2;
  return [centerX, centerY, Math.abs(centerX - p.sourceX), Math.abs(centerY - p.sourceY)];
}

/** Straight line between two endpoints. */
export function getStraightPath(p: {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}): PathResult {
  const [labelX, labelY, offsetX, offsetY] = getEdgeCenter(p);
  return [`M ${p.sourceX},${p.sourceY} L ${p.targetX},${p.targetY}`, labelX, labelY, offsetX, offsetY];
}

// ── Bezier ──────────────────────────────────────────────────────────────────

/**
 * Control-point offset for a bezier endpoint. Positive distance scales linearly;
 * a negative distance (target behind source) uses a `sqrt` fallback so the curve
 * bows out instead of collapsing into a cusp.
 */
function calculateControlOffset(distance: number, curvature: number): number {
  if (distance >= 0) return 0.5 * distance;
  return curvature * 25 * Math.sqrt(-distance);
}

function getControlWithCurvature(
  pos: Position,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  c: number,
): [number, number] {
  switch (pos) {
    case 'left': return [x1 - calculateControlOffset(x1 - x2, c), y1];
    case 'right': return [x1 + calculateControlOffset(x2 - x1, c), y1];
    case 'top': return [x1, y1 - calculateControlOffset(y1 - y2, c)];
    case 'bottom': return [x1, y1 + calculateControlOffset(y2 - y1, c)];
  }
}

/** Cubic bezier respecting handle sides. `curvature` (0–1) controls bow. */
export function getBezierPath(p: {
  sourceX: number;
  sourceY: number;
  sourcePosition?: Position;
  targetX: number;
  targetY: number;
  targetPosition?: Position;
  curvature?: number;
}): PathResult {
  const {
    sourceX, sourceY, sourcePosition = 'bottom',
    targetX, targetY, targetPosition = 'top',
    curvature = 0.25,
  } = p;

  const [sourceCx, sourceCy] = getControlWithCurvature(sourcePosition, sourceX, sourceY, targetX, targetY, curvature);
  const [targetCx, targetCy] = getControlWithCurvature(targetPosition, targetX, targetY, sourceX, sourceY, curvature);

  // Point on the cubic at t = 0.5 (binomial weights 1/8, 3/8, 3/8, 1/8).
  const labelX = sourceX * 0.125 + sourceCx * 0.375 + targetCx * 0.375 + targetX * 0.125;
  const labelY = sourceY * 0.125 + sourceCy * 0.375 + targetCy * 0.375 + targetY * 0.125;

  const path = `M ${sourceX},${sourceY} C ${sourceCx},${sourceCy} ${targetCx},${targetCy} ${targetX},${targetY}`;
  return [path, labelX, labelY, Math.abs(labelX - sourceX), Math.abs(labelY - sourceY)];
}

// ── Smooth step / step ────────────────────────────────────────────────────────

const handleDirections: Record<Position, XYPosition> = {
  top: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

function getDirection(source: XYPosition, sourcePosition: Position, target: XYPosition): XYPosition {
  if (sourcePosition === 'left' || sourcePosition === 'right')
    return source.x < target.x ? { x: 1, y: 0 } : { x: -1, y: 0 };
  return source.y < target.y ? { x: 0, y: 1 } : { x: 0, y: -1 };
}

function distance(a: XYPosition, b: XYPosition): number {
  return Math.hypot((b.x - a.x), (b.y - a.y));
}

/**
 * One rounded corner at point `b` between segments `a→b` and `b→c`. Bend radius
 * is clamped to half of each adjacent segment so it never overshoots.
 */
function getBend(a: XYPosition, b: XYPosition, c: XYPosition, size: number): string {
  const bend = Math.min(distance(a, b) / 2, distance(b, c) / 2, size);
  const { x, y } = b;

  // Collinear → no corner.
  if ((a.x === x && x === c.x) || (a.y === y && y === c.y))
    return `L ${x},${y}`;

  if (a.y === y) {
    const xDir = a.x < c.x ? -1 : 1;
    const yDir = a.y < c.y ? 1 : -1;
    return `L ${x + bend * xDir},${y} Q ${x},${y} ${x},${y + bend * yDir}`;
  }

  const xDir = a.x < c.x ? 1 : -1;
  const yDir = a.y < c.y ? -1 : 1;
  return `L ${x},${y + bend * yDir} Q ${x},${y} ${x + bend * xDir},${y}`;
}

function getStepPoints(
  source: XYPosition,
  sourcePosition: Position,
  target: XYPosition,
  targetPosition: Position,
  offset: number,
  center: { x?: number; y?: number },
): { points: XYPosition[]; labelX: number; labelY: number } {
  const sourceDir = handleDirections[sourcePosition];
  const targetDir = handleDirections[targetPosition];
  const sourceGapped: XYPosition = { x: source.x + sourceDir.x * offset, y: source.y + sourceDir.y * offset };
  const targetGapped: XYPosition = { x: target.x + targetDir.x * offset, y: target.y + targetDir.y * offset };
  const dir = getDirection(sourceGapped, sourcePosition, targetGapped);
  const dirAccessor: keyof XYPosition = dir.x !== 0 ? 'x' : 'y';
  const currDir = dir[dirAccessor];

  let points: XYPosition[];
  let centerX: number;
  let centerY: number;
  const sourceGapPoint: XYPosition = { ...sourceGapped };
  const targetGapPoint: XYPosition = { ...targetGapped };
  const dirX = dir.x !== 0;

  if (sourceDir[dirAccessor] * targetDir[dirAccessor] === -1) {
    centerX = center.x ?? (sourceGapped.x + targetGapped.x) / 2;
    centerY = center.y ?? (sourceGapped.y + targetGapped.y) / 2;

    // Build only the split that is actually used (avoids allocating both).
    const useVertical = (sourceDir[dirAccessor] === currDir) === dirX;
    points = useVertical
      ? [{ x: centerX, y: sourceGapped.y }, { x: centerX, y: targetGapped.y }]
      : [{ x: sourceGapped.x, y: centerY }, { x: targetGapped.x, y: centerY }];
  }
  else {
    const useTargetSource = dirX ? sourceDir.y === currDir : sourceDir.x !== currDir;
    points = useTargetSource
      ? [{ x: targetGapped.x, y: sourceGapped.y }]
      : [{ x: sourceGapped.x, y: targetGapped.y }];

    centerX = (sourceGapped.x + targetGapped.x) / 2;
    centerY = (sourceGapped.y + targetGapped.y) / 2;

    // Same side: nudge the gap point so it doesn't overlap when handles are close.
    if (sourcePosition === targetPosition) {
      const diff = Math.abs(source[dirAccessor] - target[dirAccessor]);
      if (diff <= offset) {
        const gapOffset = Math.min(offset - 1, offset - diff);
        if (sourceDir[dirAccessor] === currDir)
          sourceGapPoint[dirAccessor] = source[dirAccessor] + sourceDir[dirAccessor] * gapOffset;
        else
          targetGapPoint[dirAccessor] = target[dirAccessor] + targetDir[dirAccessor] * gapOffset;
      }
    }
  }

  return {
    points: [source, sourceGapPoint, ...points, targetGapPoint, target],
    labelX: centerX,
    labelY: centerY,
  };
}

/** Orthogonal path with rounded corners. `borderRadius` 0 yields sharp steps. */
export function getSmoothStepPath(p: {
  sourceX: number;
  sourceY: number;
  sourcePosition?: Position;
  targetX: number;
  targetY: number;
  targetPosition?: Position;
  borderRadius?: number;
  offset?: number;
  centerX?: number;
  centerY?: number;
}): PathResult {
  const {
    sourceX, sourceY, sourcePosition = 'bottom',
    targetX, targetY, targetPosition = 'top',
    borderRadius = 5, offset = 20, centerX, centerY,
  } = p;

  const { points, labelX, labelY } = getStepPoints(
    { x: sourceX, y: sourceY }, sourcePosition,
    { x: targetX, y: targetY }, targetPosition,
    offset, { x: centerX, y: centerY },
  );

  let path = '';
  for (let i = 0; i < points.length; i++) {
    const cur = points[i]!;
    if (i > 0 && i < points.length - 1)
      path += getBend(points[i - 1]!, cur, points[i + 1]!, borderRadius);
    else
      path += `${i === 0 ? 'M' : 'L'} ${cur.x},${cur.y} `;
  }

  return [path.trim(), labelX, labelY, Math.abs(labelX - sourceX), Math.abs(labelY - sourceY)];
}

/** Sharp orthogonal path (smooth step with zero corner radius). */
export function getStepPath(p: Parameters<typeof getSmoothStepPath>[0]): PathResult {
  return getSmoothStepPath({ ...p, borderRadius: 0 });
}

// ── Markers ──────────────────────────────────────────────────────────────────

/**
 * Deterministic, dedupe-safe id for a marker `<defs>` entry, scoped to the flow
 * instance. Identical descriptors collapse to one DOM marker.
 */
export function getMarkerId(marker: EdgeMarker | string, flowId: string): string {
  if (typeof marker === 'string')
    return `${flowId}__marker-url-${marker.replaceAll(/\W/g, '')}`;
  const parts = [
    marker.type,
    marker.color ?? '',
    marker.width ?? '',
    marker.height ?? '',
    marker.strokeWidth ?? '',
    marker.orient ?? '',
    marker.markerUnits ?? '',
  ];
  return `${flowId}__marker-${parts.join('-').replaceAll(/[^\w-]/g, '')}`;
}
