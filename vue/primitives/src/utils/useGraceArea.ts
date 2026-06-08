import { onScopeDispose, ref, watchEffect } from 'vue';
import type { Ref } from 'vue';

interface Point { x: number; y: number }
type Polygon = Point[];
type Side = 'top' | 'right' | 'bottom' | 'left';

const POINTER_TRANSIT_TIMEOUT = 300;

/**
 * Tracks pointer transit between a trigger and a floating container using
 * a convex-hull "safe area" polygon so the floating content doesn't close
 * when the pointer briefly leaves the trigger en route to it.
 *
 * Reference behavior: a hull is computed from the exit point (padded outward
 * from the side the pointer leaves) plus the four corners of the hover target.
 * While the pointer remains inside that hull, it's considered "in transit".
 */
export function useGraceArea(
  triggerElement: Ref<HTMLElement | undefined>,
  containerElement: Ref<HTMLElement | undefined>,
) {
  const isPointerInTransit = ref(false);
  const pointerGraceArea = ref<Polygon | null>(null);

  let resetTimer = 0;
  const exitListeners = new Set<() => void>();

  function clearResetTimer() {
    if (resetTimer) {
      clearTimeout(resetTimer);
      resetTimer = 0;
    }
  }

  function scheduleTransitReset() {
    clearResetTimer();
    resetTimer = globalThis.setTimeout(() => {
      isPointerInTransit.value = false;
      resetTimer = 0;
    }, POINTER_TRANSIT_TIMEOUT);
  }

  function handleRemoveGraceArea() {
    pointerGraceArea.value = null;
    isPointerInTransit.value = false;
    clearResetTimer();
  }

  function handleCreateGraceArea(event: PointerEvent, hoverTarget: HTMLElement | undefined) {
    if (!hoverTarget) return;
    const currentTarget = event.currentTarget as HTMLElement;
    const exitPoint = { x: event.clientX, y: event.clientY };
    const exitSide = getExitSideFromRect(exitPoint, currentTarget.getBoundingClientRect());
    const paddedExitPoints = getPaddedExitPoints(exitPoint, exitSide, 1);
    const hoverTargetPoints = getPointsFromRect(hoverTarget.getBoundingClientRect());
    pointerGraceArea.value = getHull([...paddedExitPoints, ...hoverTargetPoints]);
    isPointerInTransit.value = true;
    scheduleTransitReset();
  }

  watchEffect((cleanup) => {
    const trigger = triggerElement.value;
    const container = containerElement.value;
    if (!trigger || !container) return;

    const onTriggerLeave = (event: PointerEvent) => handleCreateGraceArea(event, containerElement.value);
    const onContentLeave = (event: PointerEvent) => handleCreateGraceArea(event, triggerElement.value);

    trigger.addEventListener('pointerleave', onTriggerLeave);
    container.addEventListener('pointerleave', onContentLeave);

    cleanup(() => {
      trigger.removeEventListener('pointerleave', onTriggerLeave);
      container.removeEventListener('pointerleave', onContentLeave);
    });
  });

  watchEffect((cleanup) => {
    if (!pointerGraceArea.value) return;
    const doc = triggerElement.value?.ownerDocument;
    if (!doc) return;

    const onMove = (event: PointerEvent) => {
      if (!pointerGraceArea.value || !(event.target instanceof Element)) return;
      const target = event.target;
      const point = { x: event.clientX, y: event.clientY };
      const hasEnteredTarget
        = triggerElement.value?.contains(target) || containerElement.value?.contains(target);
      const outside = !isPointInPolygon(point, pointerGraceArea.value);
      const isAnotherGraceTrigger = !!target.closest('[data-grace-area-trigger]');

      if (hasEnteredTarget) {
        handleRemoveGraceArea();
      }
      else if (outside || isAnotherGraceTrigger) {
        handleRemoveGraceArea();
        for (const fn of exitListeners) fn();
      }
    };

    doc.addEventListener('pointermove', onMove);
    cleanup(() => doc.removeEventListener('pointermove', onMove));
  });

  onScopeDispose(() => {
    clearResetTimer();
    isPointerInTransit.value = false;
    exitListeners.clear();
  });

  return {
    isPointerInTransit,
    onPointerExit(fn: () => void) {
      exitListeners.add(fn);
      return () => exitListeners.delete(fn);
    },
  };
}

function getExitSideFromRect(point: Point, rect: DOMRect): Side {
  const top = Math.abs(rect.top - point.y);
  const bottom = Math.abs(rect.bottom - point.y);
  const right = Math.abs(rect.right - point.x);
  const left = Math.abs(rect.left - point.x);
  const min = Math.min(top, bottom, right, left);
  if (min === left) return 'left';
  if (min === right) return 'right';
  if (min === top) return 'top';
  return 'bottom';
}

function getPaddedExitPoints(exitPoint: Point, exitSide: Side, padding = 5): Point[] {
  switch (exitSide) {
    case 'top':
      return [
        { x: exitPoint.x - padding, y: exitPoint.y + padding },
        { x: exitPoint.x + padding, y: exitPoint.y + padding },
      ];
    case 'bottom':
      return [
        { x: exitPoint.x - padding, y: exitPoint.y - padding },
        { x: exitPoint.x + padding, y: exitPoint.y - padding },
      ];
    case 'left':
      return [
        { x: exitPoint.x + padding, y: exitPoint.y - padding },
        { x: exitPoint.x + padding, y: exitPoint.y + padding },
      ];
    case 'right':
      return [
        { x: exitPoint.x - padding, y: exitPoint.y - padding },
        { x: exitPoint.x - padding, y: exitPoint.y + padding },
      ];
  }
}

function getPointsFromRect(rect: DOMRect): Point[] {
  const { top, right, bottom, left } = rect;
  return [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom },
  ];
}

function isPointInPolygon(point: Point, polygon: Polygon): boolean {
  const { x, y } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i]!.x;
    const yi = polygon[i]!.y;
    const xj = polygon[j]!.x;
    const yj = polygon[j]!.y;
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function getHull<P extends Point>(points: readonly P[]): P[] {
  const sorted = points.slice().sort((a, b) => {
    if (a.x !== b.x) return a.x - b.x;
    return a.y - b.y;
  });
  return getHullPresorted(sorted);
}

function getHullPresorted<P extends Point>(points: readonly P[]): P[] {
  if (points.length <= 1) return points.slice();

  const upper: P[] = [];
  for (const p of points) {
    while (upper.length >= 2) {
      const q = upper[upper.length - 1]!;
      const r = upper[upper.length - 2]!;
      if ((q.x - r.x) * (p.y - r.y) >= (q.y - r.y) * (p.x - r.x)) upper.pop();
      else break;
    }
    upper.push(p);
  }
  upper.pop();

  const lower: P[] = [];
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i]!;
    while (lower.length >= 2) {
      const q = lower[lower.length - 1]!;
      const r = lower[lower.length - 2]!;
      if ((q.x - r.x) * (p.y - r.y) >= (q.y - r.y) * (p.x - r.x)) lower.pop();
      else break;
    }
    lower.push(p);
  }
  lower.pop();

  if (
    upper.length === 1
    && lower.length === 1
    && upper[0]!.x === lower[0]!.x
    && upper[0]!.y === lower[0]!.y
  ) {
    return upper;
  }
  return upper.concat(lower);
}
