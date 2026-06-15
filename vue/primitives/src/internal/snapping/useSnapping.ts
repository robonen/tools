import type { MaybeRefOrGetter, Ref } from 'vue';
import { readonly, ref, toValue } from 'vue';
import type { Point, SnapPriority, SnapResult1D, SnapResult2D, SnapTarget } from './types';
import { applyHysteresis, findNearestTarget } from './snap';

/**
 * Axis mode for {@link useSnapping}:
 * - `'1d'` — a scalar snap (use `snap1d`); the engine treats all targets as a
 *   single pool.
 * - `'2d'` — a point snap (use `snap2d`); targets are bucketed by their `axis`.
 * - `'x'` / `'y'` — like `'1d'` but only targets on that axis are considered.
 */
export type SnapAxisMode = '1d' | '2d' | 'x' | 'y';

/**
 * Per-call override passed to `snap1d` / `snap2d` for live, transient tweaks
 * that should not live in reactive options.
 */
export interface SnapCallContext {
  /** Skip snapping entirely for this call (e.g. a modifier key held down). */
  bypass?: boolean;
  /** Target id(s) to exclude (e.g. a clip must not snap to its own edges). */
  exclude?: string | Set<string>;
}

/** Reactive options for {@link useSnapping}. */
export interface SnappingOptions {
  /** Master enable switch. @default true */
  enabled?: MaybeRefOrGetter<boolean>;
  /** Snap radius in pixels. @default 8 */
  thresholdPx?: MaybeRefOrGetter<number>;
  /** Axis mode. @default '1d' */
  axis?: MaybeRefOrGetter<SnapAxisMode>;
  /**
   * Domain→pixel projection supplied by the consumer — the engine NEVER owns
   * the projection. Only needed when the consumer relies on the engine to map a
   * candidate value into pixel space; targets are expected to be pre-projected.
   */
  project?: (value: number, axis: 'x' | 'y') => number;
  /** Candidate targets (pre-projected to pixels). @default [] */
  targets?: MaybeRefOrGetter<SnapTarget[]>;
  /** Tie-breaking policy. @default undefined */
  priority?: MaybeRefOrGetter<SnapPriority>;
  /** Fraction of `thresholdPx` added to the lock release band. @default 0.5 */
  hysteresisRatio?: MaybeRefOrGetter<number>;
}

/** Reactive snap engine returned by {@link useSnapping}. */
export interface UseSnappingReturn {
  /**
   * Snap a scalar candidate. The candidate may be a domain `value` (the engine
   * projects it via `options.project`) — when no projection is configured the
   * candidate is treated as already being in pixel space.
   */
  snap1d: (value: number, ctx?: SnapCallContext) => SnapResult1D;
  /** Snap a 2D point, resolving each axis independently. */
  snap2d: (point: Point, ctx?: SnapCallContext) => SnapResult2D;
  /** Whether the most recent snap call matched a target. */
  isSnapped: Readonly<Ref<boolean>>;
  /** Targets matched by the most recent snap call (0–2 entries). */
  activeTargets: Readonly<Ref<SnapTarget[]>>;
  /** Clear locked targets and the active/snapped state. */
  reset: () => void;
}

/**
 * Reactive magnetic-snap engine for editor surfaces (timeline clip edges,
 * crop/transform handles, gradient stops). Distance math runs in PIXEL space
 * while values live in domain space, so the consumer supplies a `project`
 * callback and pre-projected targets — the engine never owns the projection.
 *
 * The hot path (`snap1d` with no match) is allocation-free: it mutates a single
 * pre-built result object and returns the candidate untouched. Per-axis locked
 * targets are kept between calls to drive hysteresis so a snapped handle does
 * not flicker between adjacent targets.
 */
export function useSnapping(options: SnappingOptions = {}): UseSnappingReturn {
  const isSnappedRef = ref(false);
  const activeTargetsRef = ref<SnapTarget[]>([]);

  // Locked target ids per axis power the hysteresis stickiness across calls.
  let lockedX: string | undefined;
  let lockedY: string | undefined;

  // Pre-allocated result objects mutated in place — the no-match hot path must
  // not allocate.
  const result1d: SnapResult1D = { value: 0, snapped: false, target: null, deltaPx: 0 };
  const result2d: SnapResult2D = {
    point: { x: 0, y: 0 },
    snappedX: false,
    snappedY: false,
    targetX: null,
    targetY: null,
  };

  function projectValue(value: number, axis: 'x' | 'y'): number {
    return options.project ? options.project(value, axis) : value;
  }

  /** Resolve one axis against the supplied target pool, mutating shared lock state. */
  function resolveAxis(
    value: number,
    axis: 'x' | 'y',
    targets: SnapTarget[],
    thresholdPx: number,
    priority: SnapPriority | undefined,
    hysteresisRatio: number,
    exclude: string | Set<string> | undefined,
    locked: string | undefined,
  ): { snapped: boolean; target: SnapTarget | null; deltaPx: number; nextLocked: string | undefined } {
    const candidatePx = projectValue(value, axis);
    const hysteresisPx = thresholdPx * hysteresisRatio;

    const { index, deltaPx } = findNearestTarget(
      candidatePx,
      targets,
      thresholdPx,
      priority,
      exclude,
      locked,
      hysteresisPx,
    );

    if (index === -1) {
      // No candidate in range: drop any prior lock.
      return { snapped: false, target: null, deltaPx: 0, nextLocked: undefined };
    }

    const best = targets[index]!;
    const bestDistPx = deltaPx < 0 ? -deltaPx : deltaPx;

    // Distance of the prior lock this frame (Infinity if it left range / is gone).
    let prevDistPx = Infinity;
    if (locked !== undefined) {
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i]!;
        if (t.id === locked) {
          const d = t.px - candidatePx;
          prevDistPx = d < 0 ? -d : d;
          break;
        }
      }
    }

    const steal = applyHysteresis(locked, best.id, bestDistPx, prevDistPx, thresholdPx, hysteresisRatio);

    if (!steal && locked !== undefined) {
      // Keep the prior lock if it is still a valid (in-range) target.
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i]!;
        if (t.id === locked) {
          const heldDelta = t.px - candidatePx;
          return { snapped: true, target: t, deltaPx: heldDelta, nextLocked: locked };
        }
      }
    }

    return { snapped: true, target: best, deltaPx, nextLocked: best.id };
  }

  function snap1d(value: number, ctx?: SnapCallContext): SnapResult1D {
    const enabled = toValue(options.enabled) ?? true;

    // Disabled or per-call bypass: pass through with no allocation.
    if (!enabled || ctx?.bypass) {
      result1d.value = value;
      result1d.snapped = false;
      result1d.target = null;
      result1d.deltaPx = 0;
      if (isSnappedRef.value) isSnappedRef.value = false;
      if (activeTargetsRef.value.length) activeTargetsRef.value = [];
      lockedX = undefined;
      return result1d;
    }

    const mode = toValue(options.axis) ?? '1d';
    const axis: 'x' | 'y' = mode === 'y' ? 'y' : 'x';
    const thresholdPx = toValue(options.thresholdPx) ?? 8;
    const hysteresisRatio = toValue(options.hysteresisRatio) ?? 0.5;
    const priority = toValue(options.priority);
    const allTargets = toValue(options.targets) ?? [];

    // For 'x'/'y' modes filter to the axis; '1d' uses all targets as one pool.
    const targets = mode === 'x' || mode === 'y'
      ? allTargets.filter(t => t.axis === axis)
      : allTargets;

    const r = resolveAxis(
      value,
      axis,
      targets,
      thresholdPx,
      priority,
      hysteresisRatio,
      ctx?.exclude,
      lockedX,
    );
    lockedX = r.nextLocked;

    if (!r.snapped || r.target === null) {
      // Hot path: no match — return the candidate untouched, zero allocation.
      result1d.value = value;
      result1d.snapped = false;
      result1d.target = null;
      result1d.deltaPx = 0;
      if (isSnappedRef.value) isSnappedRef.value = false;
      if (activeTargetsRef.value.length) activeTargetsRef.value = [];
      return result1d;
    }

    result1d.value = r.target.value;
    result1d.snapped = true;
    result1d.target = r.target;
    result1d.deltaPx = r.deltaPx;
    isSnappedRef.value = true;
    activeTargetsRef.value = [r.target];
    return result1d;
  }

  function snap2d(point: Point, ctx?: SnapCallContext): SnapResult2D {
    const enabled = toValue(options.enabled) ?? true;

    if (!enabled || ctx?.bypass) {
      result2d.point.x = point.x;
      result2d.point.y = point.y;
      result2d.snappedX = false;
      result2d.snappedY = false;
      result2d.targetX = null;
      result2d.targetY = null;
      if (isSnappedRef.value) isSnappedRef.value = false;
      if (activeTargetsRef.value.length) activeTargetsRef.value = [];
      lockedX = undefined;
      lockedY = undefined;
      return result2d;
    }

    const thresholdPx = toValue(options.thresholdPx) ?? 8;
    const hysteresisRatio = toValue(options.hysteresisRatio) ?? 0.5;
    const priority = toValue(options.priority);
    const allTargets = toValue(options.targets) ?? [];

    const xTargets = allTargets.filter(t => t.axis === 'x');
    const yTargets = allTargets.filter(t => t.axis === 'y');

    const rx = resolveAxis(point.x, 'x', xTargets, thresholdPx, priority, hysteresisRatio, ctx?.exclude, lockedX);
    const ry = resolveAxis(point.y, 'y', yTargets, thresholdPx, priority, hysteresisRatio, ctx?.exclude, lockedY);
    lockedX = rx.nextLocked;
    lockedY = ry.nextLocked;

    result2d.point.x = rx.snapped && rx.target ? rx.target.value : point.x;
    result2d.point.y = ry.snapped && ry.target ? ry.target.value : point.y;
    result2d.snappedX = rx.snapped;
    result2d.snappedY = ry.snapped;
    result2d.targetX = rx.target;
    result2d.targetY = ry.target;

    const matched: SnapTarget[] = [];
    if (rx.target) matched.push(rx.target);
    if (ry.target) matched.push(ry.target);
    isSnappedRef.value = matched.length > 0;
    activeTargetsRef.value = matched;
    return result2d;
  }

  function reset(): void {
    lockedX = undefined;
    lockedY = undefined;
    isSnappedRef.value = false;
    activeTargetsRef.value = [];
  }

  return {
    snap1d,
    snap2d,
    isSnapped: readonly(isSnappedRef),
    activeTargets: readonly(activeTargetsRef) as Readonly<Ref<SnapTarget[]>>,
    reset,
  };
}
