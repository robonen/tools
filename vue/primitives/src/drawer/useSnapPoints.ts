import type { Ref } from 'vue';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { setStyle } from '@robonen/platform/browsers';
import { isVertical } from './helpers';
import { TRANSITIONS, VELOCITY_THRESHOLD } from './constants';
import type { DrawerDirection } from './types';

interface UseSnapPointsProps {
  activeSnapPoint: Ref<number | string | null | undefined>;
  snapPoints: Ref<Array<number | string> | undefined>;
  fadeFromIndex: Ref<number | undefined>;
  drawerRef: Ref<HTMLElement | undefined>;
  overlayRef: Ref<HTMLElement | undefined>;
  onSnapPointChange: (activeSnapPointIndex: number, snapPointsOffset: number[]) => void;
  direction: Ref<DrawerDirection>;
}

const transition = (property: 'transform' | 'opacity') =>
  `${property} ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`;

/**
 * Drag/release maths for drawers configured with snap points: resolves each
 * snap point to a pixel offset, animates the drawer between them, and decides
 * which point to settle on (or whether to close) based on drag distance and
 * velocity.
 */
export function useSnapPoints({
  activeSnapPoint,
  snapPoints,
  drawerRef,
  overlayRef,
  fadeFromIndex,
  onSnapPointChange,
  direction,
}: UseSnapPointsProps) {
  const windowDimensions = ref(globalThis.window !== undefined
    ? { innerWidth: window.innerWidth, innerHeight: window.innerHeight }
    : undefined);

  function onResize() {
    windowDimensions.value = { innerWidth: window.innerWidth, innerHeight: window.innerHeight };
  }

  onMounted(() => {
    if (globalThis.window !== undefined)
      window.addEventListener('resize', onResize);
  });

  onBeforeUnmount(() => {
    if (globalThis.window !== undefined)
      window.removeEventListener('resize', onResize);
  });

  const isLastSnapPoint = computed(
    () => (snapPoints.value && activeSnapPoint.value === snapPoints.value[snapPoints.value.length - 1]) ?? null,
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

  const activeSnapPointIndex = computed(
    () => snapPoints.value?.indexOf(activeSnapPoint.value) ?? null,
  );

  const snapPointsOffset = computed(
    () =>
      snapPoints.value?.map((snapPoint) => {
        const isPx = typeof snapPoint === 'string';
        let snapPointAsNumber = 0;

        if (isPx)
          snapPointAsNumber = Number.parseInt(snapPoint, 10);

        if (isVertical(direction.value)) {
          const height = isPx
            ? snapPointAsNumber
            : windowDimensions.value
              ? (snapPoint as number) * windowDimensions.value.innerHeight
              : 0;

          if (windowDimensions.value)
            return direction.value === 'bottom' ? windowDimensions.value.innerHeight - height : -windowDimensions.value.innerHeight + height;

          return height;
        }

        const width = isPx
          ? snapPointAsNumber
          : windowDimensions.value
            ? (snapPoint as number) * windowDimensions.value.innerWidth
            : 0;

        if (windowDimensions.value)
          return direction.value === 'right' ? windowDimensions.value.innerWidth - width : -windowDimensions.value.innerWidth + width;

        return width;
      }) ?? [],
  );

  const activeSnapPointOffset = computed(() =>
    activeSnapPointIndex.value !== null ? snapPointsOffset.value?.[activeSnapPointIndex.value] : null,
  );

  function snapToPoint(dimension: number) {
    const newSnapPointIndex = snapPointsOffset.value?.indexOf(dimension) ?? null;

    // Wait for the element to be mounted before transforming it.
    nextTick(() => {
      onSnapPointChange(newSnapPointIndex, snapPointsOffset.value);
      setStyle(drawerRef.value, {
        transition: transition('transform'),
        transform: isVertical(direction.value) ? `translate3d(0, ${dimension}px, 0)` : `translate3d(${dimension}px, 0, 0)`,
      });
    });

    if (
      snapPointsOffset.value
      && newSnapPointIndex !== snapPointsOffset.value.length - 1
      && newSnapPointIndex !== fadeFromIndex?.value
    ) {
      setStyle(overlayRef.value, { transition: transition('opacity'), opacity: '0' });
    }
    else {
      setStyle(overlayRef.value, { transition: transition('opacity'), opacity: '1' });
    }

    activeSnapPoint.value = newSnapPointIndex !== null ? snapPoints.value?.[newSnapPointIndex] ?? null : null;
  }

  watch(
    [activeSnapPoint, snapPointsOffset, snapPoints],
    () => {
      if (activeSnapPoint.value) {
        const newIndex = snapPoints.value?.indexOf(activeSnapPoint.value) ?? -1;

        if (snapPointsOffset.value && newIndex !== -1 && typeof snapPointsOffset.value[newIndex] === 'number')
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
  }: {
    draggedDistance: number;
    closeDrawer: () => void;
    velocity: number;
    dismissible: boolean;
  }) {
    if (fadeFromIndex.value === undefined)
      return;

    const currentPosition
      = direction.value === 'bottom' || direction.value === 'right'
        ? (activeSnapPointOffset.value ?? 0) - draggedDistance
        : (activeSnapPointOffset.value ?? 0) + draggedDistance;
    const isOverlaySnapPoint = activeSnapPointIndex.value === fadeFromIndex.value - 1;
    const isFirst = activeSnapPointIndex.value === 0;
    const hasDraggedUp = draggedDistance > 0;

    if (isOverlaySnapPoint)
      setStyle(overlayRef.value, { transition: transition('opacity') });

    if (velocity > 2 && !hasDraggedUp) {
      if (dismissible)
        closeDrawer();
      else
        snapToPoint(snapPointsOffset.value[0]); // snap to initial point
      return;
    }

    if (velocity > 2 && hasDraggedUp && snapPointsOffset.value && snapPoints.value) {
      snapToPoint(snapPointsOffset.value[snapPoints.value.length - 1]);
      return;
    }

    // Settle on the snap point closest to where the drag ended.
    const closestSnapPoint = snapPointsOffset.value?.reduce((prev, curr) => {
      if (typeof prev !== 'number' || typeof curr !== 'number')
        return prev;

      return Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev;
    });

    const dim = isVertical(direction.value) ? window.innerHeight : window.innerWidth;
    if (velocity > VELOCITY_THRESHOLD && Math.abs(draggedDistance) < dim * 0.4) {
      const dragDirection = hasDraggedUp ? 1 : -1; // 1 = up, -1 = down

      // Ignore an upward flick while already on the last snap point.
      if (dragDirection > 0 && isLastSnapPoint.value) {
        snapToPoint(snapPointsOffset.value[(snapPoints.value?.length ?? 0) - 1]);
        return;
      }

      if (isFirst && dragDirection < 0 && dismissible)
        closeDrawer();

      if (activeSnapPointIndex.value === null)
        return;

      snapToPoint(snapPointsOffset.value[activeSnapPointIndex.value + dragDirection]);
      return;
    }

    snapToPoint(closestSnapPoint);
  }

  function onDrag({ draggedDistance }: { draggedDistance: number }) {
    if (activeSnapPointOffset.value === null)
      return;

    const newValue
      = direction.value === 'bottom' || direction.value === 'right'
        ? (activeSnapPointOffset.value ?? 0) - draggedDistance
        : (activeSnapPointOffset.value ?? 0) + draggedDistance;

    // Don't drag past the last (largest) snap point.
    if ((direction.value === 'bottom' || direction.value === 'right') && newValue < snapPointsOffset.value[snapPointsOffset.value.length - 1])
      return;

    if ((direction.value === 'top' || direction.value === 'left') && newValue > snapPointsOffset.value[snapPointsOffset.value.length - 1])
      return;

    setStyle(drawerRef.value, {
      transform: isVertical(direction.value) ? `translate3d(0, ${newValue}px, 0)` : `translate3d(${newValue}px, 0, 0)`,
    });
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
    snapPointsOffset,
  };
}
