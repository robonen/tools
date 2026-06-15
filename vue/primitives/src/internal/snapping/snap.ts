import type { SnapKind, SnapPriority, SnapTarget } from './types';

/**
 * Rank of `kind` within a priority order: lower number = higher priority.
 * Kinds not listed sort after every listed kind (and tie among themselves).
 */
function priorityRank(kind: SnapKind, order: SnapKind[] | undefined): number {
  if (order === undefined) return 0;
  const i = order.indexOf(kind);
  return i === -1 ? order.length : i;
}

/** Whether `id` is excluded, accepting a single id or a set of ids. */
function isExcluded(id: string | undefined, exclude: string | Set<string> | undefined): boolean {
  if (id === undefined || exclude === undefined) return false;
  return typeof exclude === 'string' ? id === exclude : exclude.has(id);
}

/**
 * Single-pass nearest-target search within `thresholdPx`, honoring priority
 * order. A higher-priority {@link SnapKind} can win even when a few pixels
 * farther than the closest candidate, bounded by `priority.relaxPx`. Targets
 * whose `id` is in `excludeId` are skipped (e.g. a clip snapping to itself).
 *
 * When `lockedId` matches a candidate, its effective threshold is widened by
 * `hysteresisPx` so an already-snapped handle stays sticky and resists
 * flickering as the pointer drifts near the edge of the snap band.
 *
 * Allocation-free. Returns `{ index: -1, deltaPx: Infinity }` when no target is
 * in range.
 *
 * @param targetPx Pixel position being tested (the dragged edge/handle).
 * @param targets Candidate targets (mixed axes allowed; caller pre-filters axis).
 * @param thresholdPx Base snap radius in pixels.
 * @param priority Optional kind ordering + relax band for tie-breaking.
 * @param excludeId Id (or set) to skip.
 * @param lockedId Currently locked target id, widened by `hysteresisPx`.
 * @param hysteresisPx Extra radius granted to the locked target. @default 0
 */
export function findNearestTarget(
  targetPx: number,
  targets: SnapTarget[],
  thresholdPx: number,
  priority?: SnapPriority,
  excludeId?: string | Set<string>,
  lockedId?: string,
  hysteresisPx = 0,
): { index: number; deltaPx: number } {
  const order = priority?.order;
  const relaxPx = priority?.relaxPx ?? 0;

  let bestIndex = -1;
  let bestDist = Infinity;
  let bestSignedDelta = Infinity;
  let bestRank = Infinity;

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i]!;
    if (isExcluded(t.id, excludeId)) continue;

    // Sticky targets earn a wider capture radius while they hold the lock.
    const reach = lockedId !== undefined && t.id === lockedId
      ? thresholdPx + hysteresisPx
      : thresholdPx;

    const signedDelta = t.px - targetPx;
    const dist = signedDelta < 0 ? -signedDelta : signedDelta;
    if (dist > reach) continue;

    if (bestIndex === -1) {
      bestIndex = i;
      bestDist = dist;
      bestSignedDelta = signedDelta;
      bestRank = priorityRank(t.kind, order);
      continue;
    }

    const rank = priorityRank(t.kind, order);
    let wins: boolean;
    if (order === undefined) {
      // Pure nearest.
      wins = dist < bestDist;
    }
    else if (rank < bestRank) {
      // Higher priority: wins outright if within the relax band of the best.
      wins = dist <= bestDist + relaxPx;
    }
    else if (rank > bestRank) {
      // Lower priority: may only win if strictly nearer beyond the relax band.
      wins = dist + relaxPx < bestDist;
    }
    else {
      // Same priority: nearest wins.
      wins = dist < bestDist;
    }

    if (wins) {
      bestIndex = i;
      bestDist = dist;
      bestSignedDelta = signedDelta;
      bestRank = rank;
    }
  }

  return { index: bestIndex, deltaPx: bestIndex === -1 ? Infinity : bestSignedDelta };
}

/**
 * Pure hysteresis gate: decides whether a newly-computed best target should
 * steal the lock from `prevLockedId`.
 *
 * - When there is no prior lock, any best target takes it.
 * - When the prior lock is still the best candidate, it keeps the lock.
 * - When a different target is now best, it must be *strictly closer* than the
 *   prior lock's current distance — and the prior lock only releases once the
 *   pointer leaves a release band widened to `thresholdPx * (1 + hysteresisRatio)`.
 *
 * This keeps a snapped handle from chattering between two adjacent targets.
 *
 * @param prevLockedId Previously locked target id (`undefined` if none).
 * @param bestId Id of the current best candidate (`undefined` if none in range).
 * @param bestDistPx Distance of the current best candidate, in pixels.
 * @param prevDistPx Distance of `prevLockedId` this frame (`Infinity` if gone).
 * @param thresholdPx Base snap radius in pixels.
 * @param hysteresisRatio Fraction of `thresholdPx` added to the release band.
 */
export function applyHysteresis(
  prevLockedId: string | undefined,
  bestId: string | undefined,
  bestDistPx: number,
  prevDistPx: number,
  thresholdPx: number,
  hysteresisRatio: number,
): boolean {
  // Nothing in range — best (if any) takes a fresh lock.
  if (bestId === undefined) return false;

  // No prior lock, or the best candidate *is* the prior lock: take/keep it.
  if (prevLockedId === undefined || bestId === prevLockedId) return true;

  const releaseBand = thresholdPx * (1 + hysteresisRatio);

  // Prior lock has left its (widened) release band — let the new best take over.
  if (prevDistPx > releaseBand) return true;

  // Prior lock is still within reach: only yield to a strictly closer target.
  return bestDistPx < prevDistPx;
}

/**
 * Build grid-line targets at integer multiples of `step`, anchored at
 * `floor(domainStart / step) * step` so lines stay phase-stable as the visible
 * domain pans. Each line is pre-projected to pixels via `project`.
 *
 * @param domainStart Inclusive start of the visible domain.
 * @param domainEnd Inclusive end of the visible domain.
 * @param step Grid spacing in domain units (must be `> 0`).
 * @param project Domain→pixel projection supplied by the consumer.
 * @param axis Axis the produced targets constrain.
 */
export function gridTargets(
  domainStart: number,
  domainEnd: number,
  step: number,
  project: (v: number) => number,
  axis: 'x' | 'y',
): SnapTarget[] {
  const out: SnapTarget[] = [];
  if (!(step > 0) || !Number.isFinite(step)) return out;
  if (domainEnd < domainStart) return out;

  const anchor = Math.floor(domainStart / step) * step;
  for (let v = anchor; v <= domainEnd; v += step) {
    // Anchor below domainStart is possible by one step; skip lines fully before it.
    if (v < domainStart) continue;
    out.push({ axis, px: project(v), value: v, kind: 'grid' });
  }
  return out;
}

/**
 * Build edge + center targets from a set of rectangles. On the `x` axis each
 * rect contributes `left`, `right`, and horizontal center; on `y` it contributes
 * `top`, `bottom`, and vertical center. Edges carry kind `'edge'`, centers
 * `'center'`. The rect's `id` (if any) propagates to every produced target so a
 * dragged clip can exclude its own edges.
 *
 * @param rects Rectangles in domain space.
 * @param axis Axis to extract targets for.
 * @param project Domain→pixel projection supplied by the consumer.
 */
export function edgeTargets(
  rects: Array<{ left: number; right: number; top: number; bottom: number; id?: string }>,
  axis: 'x' | 'y',
  project: (v: number) => number,
): SnapTarget[] {
  const out: SnapTarget[] = [];
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i]!;
    const lo = axis === 'x' ? r.left : r.top;
    const hi = axis === 'x' ? r.right : r.bottom;
    const mid = (lo + hi) / 2;
    out.push({ axis, px: project(lo), value: lo, kind: 'edge', id: r.id });
    out.push({ axis, px: project(hi), value: hi, kind: 'edge', id: r.id });
    out.push({ axis, px: project(mid), value: mid, kind: 'center', id: r.id });
  }
  return out;
}

/**
 * Build point targets (playhead, markers, guides, gradient stops, …) from a
 * list of domain values. Each value is pre-projected to pixels. When `ids` is
 * supplied, `ids[i]` is attached to the target produced from `values[i]`.
 *
 * @param values Domain values to turn into targets.
 * @param kind Kind stamped on every produced target.
 * @param axis Axis the produced targets constrain.
 * @param project Domain→pixel projection supplied by the consumer.
 * @param ids Optional per-value ids (positionally aligned with `values`).
 */
export function pointTargets(
  values: number[],
  kind: SnapKind,
  axis: 'x' | 'y',
  project: (v: number) => number,
  ids?: string[],
): SnapTarget[] {
  const out: SnapTarget[] = [];
  for (let i = 0; i < values.length; i++) {
    const v = values[i]!;
    out.push({ axis, px: project(v), value: v, kind, id: ids?.[i] });
  }
  return out;
}
