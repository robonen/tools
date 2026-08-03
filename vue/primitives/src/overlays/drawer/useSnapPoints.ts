import type { Ref } from 'vue';
import { computed, nextTick, watch } from 'vue';
import { setStyle } from '@robonen/platform/browsers';
import { isVertical, translateAxis, writeTransform } from './helpers';
import { TRANSITIONS } from './constants';
import { computeSettleDuration } from './gesture';
import { findSnapPointIndex, projectSnapRelease, resolveSnapPointOffset } from './snapping';
import type { DrawerDirection } from './types';

interface UseSnapPointsProps {
  activeSnapPoint: Ref<number | string | null | undefined>;
  snapPoints: Ref<Array<number | string> | undefined>;
  fadeFromIndex: Ref<number | undefined>;
  drawerRef: Ref<HTMLElement | undefined>;
  overlayRef: Ref<HTMLElement | undefined>;
  onSnapPointChange: (activeSnapPointIndex: number, snapPointsOffset: number[]) => void;
  direction: Ref<DrawerDirection>;
  snapToSequentialPoints: Ref<boolean>;
  /** Shared reactive window dimensions (from the engine's `useWindowSize`). */
  windowWidth: Ref<number>;
  windowHeight: Ref<number>;
}

const transition = (property: 'transform' | 'opacity', duration: number = TRANSITIONS.DURATION) =>
  `${property} ${duration}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`;

function readRootFontSize(): number {
  return Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
}

/**
 * Drag/release maths for drawers configured with snap points: resolves each
 * snap point to a pixel offset, animates the drawer between them, and settles
 * on release by projecting the drag target along the fling velocity.
 */
export function useSnapPoints({
  activeSnapPoint,
  snapPoints,
  drawerRef,
  overlayRef,
  fadeFromIndex,
  onSnapPointChange,
  direction,
  snapToSequentialPoints,
  windowWidth,
  windowHeight,
}: UseSnapPointsProps) {
  // Direction resolved once per change instead of string-comparing per move.
  const verticalAxis = computed(() => isVertical(direction.value));
  const dismissMultiplier = computed<1 | -1>(() =>
    direction.value === 'bottom' || direction.value === 'right' ? 1 : -1,
  );

  function windowSizeFor(dir: DrawerDirection): number {
    return isVertical(dir) ? windowHeight.value : windowWidth.value;
  }

  let warnedInvalid = false;

  /**
   * Inline-translate offsets, index-aligned with `snapPoints` (identity such as
   * `fadeFromIndex` is preserved). Unresolvable points map to `NaN` and are
   * excluded from every settle decision.
   */
  const snapPointsOffset = computed<number[]>(() => {
    const points = snapPoints.value;

    if (!points)
      return [];

    const windowSize = windowSizeFor(direction.value);
    const rootFontSize = globalThis.document !== undefined ? readRootFontSize() : 16;
    const offsets = points.map(point => resolveSnapPointOffset(point, direction.value, windowSize, rootFontSize));

    if (!warnedInvalid && offsets.some(offset => !Number.isFinite(offset))) {
      warnedInvalid = true;
      console.warn(
        '[Drawer] Unsupported snap point value. Use a fraction (0-1), a px number, or a px/rem string:',
        points.filter((_, index) => !Number.isFinite(offsets[index])),
      );
    }

    return offsets;
  });

  const activeSnapPointIndex = computed<number | null>(() => {
    const points = snapPoints.value;

    if (!points)
      return null;

    const windowSize = windowSizeFor(direction.value);
    const rootFontSize = globalThis.document !== undefined ? readRootFontSize() : 16;

    // Identity first, then resolved-size equivalence (`0.5` vs `'360px'`) so a
    // controlled active point in a different representation still matches.
    return findSnapPointIndex(points, activeSnapPoint.value, windowSize, rootFontSize);
  });

  const isLastSnapPoint = computed(
    () => (snapPoints.value && activeSnapPointIndex.value === snapPoints.value.length - 1) ?? null,
  );

  const shouldFade = computed(
    () =>
      (snapPoints.value
        && snapPoints.value.length > 0
        && (fadeFromIndex?.value || fadeFromIndex?.value === 0)
        && !Number.isNaN(fadeFromIndex?.value)
        && snapPoints.value[fadeFromIndex?.value ?? -1] === activeSnapPoint.value)
      || !snapPoints.value,
  );

  const activeSnapPointOffset = computed(() =>
    activeSnapPointIndex.value !== null ? snapPointsOffset.value?.[activeSnapPointIndex.value] : null,
  );

  function snapToPoint(dimension: number, options?: { velocity?: number; from?: number | null }) {
    if (!Number.isFinite(dimension))
      return;

    const newSnapPointIndex = snapPointsOffset.value?.indexOf(dimension) ?? null;
    const from = options?.from;
    const remaining = typeof from === 'number' ? Math.abs(dimension - from) : Number.NaN;
    const duration = computeSettleDuration(remaining, options?.velocity ?? 0);

    // Wait for the element to be mounted before transforming it.
    nextTick(() => {
      onSnapPointChange(newSnapPointIndex, snapPointsOffset.value);
      setStyle(drawerRef.value, {
        transition: transition('transform', duration),
        transform: translateAxis(verticalAxis.value, dimension),
      });
    });

    if (
      snapPointsOffset.value
      && newSnapPointIndex !== snapPointsOffset.value.length - 1
      && newSnapPointIndex !== fadeFromIndex?.value
    ) {
      setStyle(overlayRef.value, { transition: transition('opacity', duration), opacity: '0' });
    }
    else {
      setStyle(overlayRef.value, { transition: transition('opacity', duration), opacity: '1' });
    }

    activeSnapPoint.value = newSnapPointIndex !== null ? snapPoints.value?.[newSnapPointIndex] ?? null : null;
  }

  /** Settle back onto the active snap point (used when a gesture is aborted). */
  function restoreActiveSnapPoint() {
    const offset = activeSnapPointOffset.value;

    if (typeof offset === 'number' && Number.isFinite(offset))
      snapToPoint(offset);
  }

  watch(
    [activeSnapPoint, snapPointsOffset, snapPoints],
    () => {
      if (activeSnapPoint.value) {
        const newIndex = activeSnapPointIndex.value ?? -1;

        if (snapPointsOffset.value && newIndex !== -1 && Number.isFinite(snapPointsOffset.value[newIndex]))
          snapToPoint(snapPointsOffset.value[newIndex]);
      }
    },
    { immediate: true },
  );

  function onRelease({
    draggedDistance,
    closeDrawer,
    velocity,
    dismissible,
    drawerSize,
  }: {
    /** Drag distance since press, positive toward open/expand. */
    draggedDistance: number;
    closeDrawer: () => void;
    /** Instantaneous release velocity, positive toward dismiss (px/ms). */
    velocity: number;
    dismissible: boolean;
    /** Drawer size (px) along the drag axis. */
    drawerSize: number;
  }) {
    if (fadeFromIndex.value === undefined)
      return;

    const multiplier = dismissMultiplier.value;
    const offsets = snapPointsOffset.value.map(offset => offset * multiplier);
    const isOverlaySnapPoint = activeSnapPointIndex.value === fadeFromIndex.value - 1;

    if (isOverlaySnapPoint)
      setStyle(overlayRef.value, { transition: transition('opacity') });

    const result = projectSnapRelease({
      offsets,
      activeIndex: activeSnapPointIndex.value,
      draggedDistance,
      velocity,
      drawerSize,
      dismissible,
      sequential: snapToSequentialPoints.value,
    });

    if (result.type === 'close') {
      closeDrawer();
      return;
    }

    const target = snapPointsOffset.value[result.index];
    const from = (activeSnapPointOffset.value ?? 0) - draggedDistance * multiplier;

    snapToPoint(target, { velocity, from });
  }

  function onDrag({ draggedDistance }: { draggedDistance: number }): number | null {
    const activeOffset = activeSnapPointOffset.value;

    if (activeOffset === null || activeOffset === undefined || !Number.isFinite(activeOffset))
      return null;

    const positive = dismissMultiplier.value === 1;
    const newValue = positive ? activeOffset - draggedDistance : activeOffset + draggedDistance;
    const offsets = snapPointsOffset.value;
    const lastOffset = offsets[offsets.length - 1];

    // Don't drag past the last (largest) snap point.
    if (Number.isFinite(lastOffset) && (positive ? newValue < lastOffset : newValue > lastOffset))
      return null;

    writeTransform(drawerRef.value, translateAxis(verticalAxis.value, newValue));

    return newValue;
  }

  function getPercentageDragged(absDraggedDistance: number, isDraggingDown: boolean) {
    if (
      !snapPoints.value
      || typeof activeSnapPointIndex.value !== 'number'
      || !snapPointsOffset.value
      || fadeFromIndex.value === undefined
    )
      return null;

    // Whether we're dragging toward a snap point that should show the overlay.
    const isOverlaySnapPoint = activeSnapPointIndex.value === fadeFromIndex.value - 1;
    const isOverlaySnapPointOrHigher = activeSnapPointIndex.value >= fadeFromIndex.value;

    if (isOverlaySnapPointOrHigher && isDraggingDown)
      return 0;

    // Don't animate, but still use this one when dragging away from the overlay snap point.
    if (isOverlaySnapPoint && !isDraggingDown)
      return 1;
    if (!shouldFade.value && !isOverlaySnapPoint)
      return null;

    const targetSnapPointIndex = isOverlaySnapPoint ? activeSnapPointIndex.value + 1 : activeSnapPointIndex.value - 1;

    // Distance between the overlay snap point and its neighbour, used to scale opacity.
    const snapPointDistance = isOverlaySnapPoint
      ? snapPointsOffset.value[targetSnapPointIndex] - snapPointsOffset.value[targetSnapPointIndex - 1]
      : snapPointsOffset.value[targetSnapPointIndex + 1] - snapPointsOffset.value[targetSnapPointIndex];

    const percentageDragged = absDraggedDistance / Math.abs(snapPointDistance);

    return isOverlaySnapPoint ? 1 - percentageDragged : percentageDragged;
  }

  return {
    isLastSnapPoint,
    shouldFade,
    getPercentageDragged,
    activeSnapPointIndex,
    onRelease,
    onDrag,
    restoreActiveSnapPoint,
    snapPointsOffset,
  };
}
