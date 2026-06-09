import type { Ref } from 'vue';
import { computed, ref, watch, watchEffect } from 'vue';
import { isClient } from '@robonen/platform/multi';
import { getTranslate, resetStyle, setStyle } from '@robonen/platform/browsers';
import { dampenValue, getDrawerWrapper, isVertical } from './helpers';
import { BORDER_RADIUS, DRAG_CLASS, NESTED_DISPLACEMENT, TRANSITIONS, VELOCITY_THRESHOLD, WINDOW_TOP_OFFSET } from './constants';
import { useSnapPoints } from './useSnapPoints';
import { usePositionFixed } from './usePositionFixed';
import type { DrawerRootContext } from './context';
import type { DrawerDirection } from './types';

export interface WithoutFadeFromProps {
  /**
   * Fractions (0–1) of the screen each snap point occupies, ordered from least
   * to most visible — e.g. `[0.2, 0.5, 0.8]`. Px strings (e.g. `'200px'`) are
   * also accepted and ignore screen height.
   */
  snapPoints?: Array<number | string>;
  /** Index of the snap point from which the overlay fade begins. Defaults to the last. */
  fadeFromIndex?: never;
}

export type DrawerRootProps = {
  /** The active snap point (two-way bindable via `v-model:active-snap-point`). */
  activeSnapPoint?: number | string | null;
  /**
   * Fraction (0–1) of the drawer that must be swiped away before it closes.
   * @default 0.25
   */
  closeThreshold?: number;
  /** Scale the page background down while the drawer is open (stacked-card look). */
  shouldScaleBackground?: boolean;
  /**
   * Set the body background to black during the scale effect.
   * @default true
   */
  setBackgroundColorOnScale?: boolean;
  /**
   * How long (ms) dragging is disabled after scrolling content inside the drawer.
   * @default 100
   */
  scrollLockTimeout?: number;
  /**
   * Keep the drawer in place when the keyboard opens, resizing it to stay
   * scrollable instead of translating it upward.
   */
  fixed?: boolean;
  /**
   * When `false`, dragging, clicking outside, and pressing escape will not close
   * the drawer. Pair with `v-model:open` so you can still control it.
   * @default true
   */
  dismissible?: boolean;
  /**
   * When `false`, the rest of the page stays interactive while the drawer is open.
   * @default true
   */
  modal?: boolean;
  /** Controlled open state (`v-model:open`). */
  open?: boolean;
  /**
   * Start opened, skipping the initial enter animation. Still reacts to `open`.
   * @default false
   */
  defaultOpen?: boolean;
  /** Marks this drawer as nested inside another (set automatically by DrawerRootNested). */
  nested?: boolean;
  /**
   * The edge the drawer is anchored to.
   * @default 'bottom'
   */
  direction?: DrawerDirection;
  /** Skip all body styling that the drawer would otherwise apply. */
  noBodyStyles?: boolean;
  /**
   * Only allow dragging via the DrawerHandle.
   * @default false
   */
  handleOnly?: boolean;
  /** Don't restore scroll position when the drawer closes after a navigation. */
  preventScrollRestoration?: boolean;
} & WithoutFadeFromProps;

export interface UseDrawerProps {
  open: Ref<boolean>;
  snapPoints: Ref<Array<number | string> | undefined>;
  dismissible: Ref<boolean>;
  nested: Ref<boolean>;
  fixed: Ref<boolean | undefined>;
  modal: Ref<boolean>;
  shouldScaleBackground: Ref<boolean | undefined>;
  setBackgroundColorOnScale: Ref<boolean | undefined>;
  activeSnapPoint: Ref<number | string | null | undefined>;
  fadeFromIndex: Ref<number | undefined>;
  closeThreshold: Ref<number>;
  scrollLockTimeout: Ref<number>;
  direction: Ref<DrawerDirection>;
  noBodyStyles: Ref<boolean>;
  preventScrollRestoration: Ref<boolean>;
  handleOnly: Ref<boolean>;
}

export interface DrawerRootEmits {
  /** Fired continuously during a drag with the fraction (0–1) dragged. */
  (e: 'drag', percentageDragged: number): void;
  /** Fired when the pointer is released, with whether the drawer stays open. */
  (e: 'release', open: boolean): void;
  /** Fired when the drawer begins closing. */
  (e: 'close'): void;
  /** Two-way binding for the open state. */
  (e: 'update:open', open: boolean): void;
  /** Two-way binding for the active snap point. */
  (e: 'update:activeSnapPoint', val: string | number): void;
  /** Fired after the open/close animation ends, with the open state at that time. */
  (e: 'animationEnd', open: boolean): void;
}

export interface DialogEmitHandlers {
  emitDrag: (percentageDragged: number) => void;
  emitRelease: (open: boolean) => void;
  emitClose: () => void;
}

export interface DrawerHandleProps {
  /** Prevent the handle tap from cycling through snap points. */
  preventCycle?: boolean;
}

function usePropOrDefaultRef<T>(prop: Ref<T | undefined> | undefined, defaultRef: Ref<T>): Ref<T> {
  return prop && !!prop.value ? (prop as Ref<T>) : defaultRef;
}

/**
 * The drawer engine: owns the drag gesture, snap-point settling, background
 * scaling, and nested-drawer coordination. Returns the value provided as
 * {@link DrawerRootContext} to the drawer parts.
 */
export function useDrawer(props: UseDrawerProps & DialogEmitHandlers): DrawerRootContext {
  const {
    emitDrag,
    emitRelease,
    emitClose,
    open,
    dismissible,
    nested,
    modal,
    shouldScaleBackground,
    setBackgroundColorOnScale,
    scrollLockTimeout,
    closeThreshold,
    activeSnapPoint,
    fadeFromIndex,
    direction,
    noBodyStyles,
    handleOnly,
    preventScrollRestoration,
  } = props;

  const hasBeenOpened = ref(open.value);
  const isDragging = ref(false);
  const justReleased = ref(false);

  const overlayRef = ref<HTMLElement | undefined>(undefined);

  const openTime = ref<Date | null>(null);
  const dragStartTime = ref<Date | null>(null);
  const dragEndTime = ref<Date | null>(null);
  const lastTimeDragPrevented = ref<Date | null>(null);
  const isAllowedToDrag = ref(false);

  const nestedOpenChangeTimer = ref<number | null>(null);

  const pointerStart = ref(0);
  const keyboardIsOpen = ref(false);

  const drawerRef = ref<HTMLElement | undefined>(undefined);
  const drawerHeightRef = computed(() => drawerRef.value?.getBoundingClientRect().height || 0);

  const snapPoints = usePropOrDefaultRef(props.snapPoints, ref<Array<number | string> | undefined>(undefined));

  const hasSnapPoints = computed(() => !!(snapPoints.value?.length ?? 0));

  const handleRef = ref<HTMLElement | undefined>(undefined);

  const {
    activeSnapPointIndex,
    onRelease: onReleaseSnapPoints,
    snapPointsOffset,
    onDrag: onDragSnapPoints,
    shouldFade,
    getPercentageDragged: getSnapPointsPercentageDragged,
  } = useSnapPoints({
    snapPoints,
    activeSnapPoint,
    drawerRef,
    fadeFromIndex,
    overlayRef,
    onSnapPointChange,
    direction,
  });

  function onSnapPointChange(activeSnapPointIndex: number, snapPointsOffset: number[]) {
    // Refresh openTime when we reach the last snap point so scrollable content
    // there isn't immediately draggable.
    if (snapPoints.value && activeSnapPointIndex === snapPointsOffset.length - 1)
      openTime.value = new Date();
  }

  usePositionFixed({
    isOpen: open,
    modal,
    nested,
    hasBeenOpened,
    noBodyStyles,
    preventScrollRestoration,
  });

  function getScale() {
    return (window.innerWidth - WINDOW_TOP_OFFSET) / window.innerWidth;
  }

  function shouldDrag(el: EventTarget | null, isDraggingInDirection: boolean) {
    if (!el)
      return false;
    let element = el as HTMLElement;
    const highlightedText = globalThis.getSelection()?.toString();
    const swipeAmount = drawerRef.value ? getTranslate(drawerRef.value, isVertical(direction.value) ? 'y' : 'x') : null;
    const date = new Date();

    if (element.hasAttribute('data-drawer-no-drag') || element.closest('[data-drawer-no-drag]'))
      return false;

    if (direction.value === 'right' || direction.value === 'left')
      return true;

    // Allow scrolling during the open animation.
    if (openTime.value && date.getTime() - openTime.value.getTime() < 500)
      return false;

    if (swipeAmount !== null) {
      if (direction.value === 'bottom' ? swipeAmount > 0 : swipeAmount < 0)
        return true;
    }

    // Don't drag when text is selected.
    if (highlightedText && highlightedText.length > 0)
      return false;

    // Don't drag right after scrolling inside the drawer.
    if (
      lastTimeDragPrevented.value
      && date.getTime() - lastTimeDragPrevented.value.getTime() < scrollLockTimeout.value
      && swipeAmount === 0
    ) {
      lastTimeDragPrevented.value = date;
      return false;
    }

    if (isDraggingInDirection) {
      lastTimeDragPrevented.value = date;
      // Dragging in the open direction → allow scrolling instead.
      return false;
    }

    // Walk up the tree; if a scrollable ancestor isn't at the top, scroll it instead of dragging.
    while (element) {
      if (element.scrollHeight > element.clientHeight) {
        if (element.scrollTop !== 0) {
          lastTimeDragPrevented.value = new Date();
          return false;
        }

        if (element.getAttribute('role') === 'dialog')
          return true;
      }

      element = element.parentNode as HTMLElement;
    }

    return true;
  }

  function onPress(event: PointerEvent) {
    if (!dismissible.value && !snapPoints.value)
      return;
    if (drawerRef.value && !drawerRef.value.contains(event.target as Node))
      return;
    isDragging.value = true;
    dragStartTime.value = new Date();

    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    pointerStart.value = isVertical(direction.value) ? event.clientY : event.clientX;
  }

  function onDrag(event: PointerEvent) {
    if (!drawerRef.value)
      return;

    if (isDragging.value) {
      const directionMultiplier = direction.value === 'bottom' || direction.value === 'right' ? 1 : -1;
      const draggedDistance
        = (pointerStart.value - (isVertical(direction.value) ? event.clientY : event.clientX)) * directionMultiplier;
      const isDraggingInDirection = draggedDistance > 0;

      // Don't allow dragging toward close past the first snap point when not dismissible.
      const noCloseSnapPointsPreCondition = snapPoints.value && !dismissible.value && !isDraggingInDirection;

      if (noCloseSnapPointsPreCondition && activeSnapPointIndex.value === 0)
        return;

      const absDraggedDistance = Math.abs(draggedDistance);
      const wrapper = getDrawerWrapper();

      // 1 means the closed position.
      let percentageDragged = absDraggedDistance / drawerHeightRef.value;
      const snapPointPercentageDragged = getSnapPointsPercentageDragged(absDraggedDistance, isDraggingInDirection);

      if (snapPointPercentageDragged !== null)
        percentageDragged = snapPointPercentageDragged;

      if (noCloseSnapPointsPreCondition && percentageDragged >= 1)
        return;

      if (!isAllowedToDrag.value && !shouldDrag(event.target, isDraggingInDirection))
        return;
      drawerRef.value.classList.add(DRAG_CLASS);
      // Once allowed, stay allowed for the whole gesture.
      isAllowedToDrag.value = true;
      setStyle(drawerRef.value, { transition: 'none' });
      setStyle(overlayRef.value, { transition: 'none' });

      if (snapPoints.value)
        onDragSnapPoints({ draggedDistance });

      // Rubber-band past the open position when there are no snap points.
      if (isDraggingInDirection && !snapPoints.value) {
        const dampenedDraggedDistance = dampenValue(draggedDistance);

        const translateValue = Math.min(dampenedDraggedDistance * -1, 0) * directionMultiplier;
        setStyle(drawerRef.value, {
          transform: isVertical(direction.value)
            ? `translate3d(0, ${translateValue}px, 0)`
            : `translate3d(${translateValue}px, 0, 0)`,
        });
        return;
      }

      const opacityValue = 1 - percentageDragged;

      if (shouldFade.value || (fadeFromIndex.value && activeSnapPointIndex.value === fadeFromIndex.value - 1)) {
        emitDrag(percentageDragged);

        setStyle(overlayRef.value, { opacity: `${opacityValue}`, transition: 'none' }, true);
      }

      if (wrapper && overlayRef.value && shouldScaleBackground.value) {
        const scaleValue = Math.min(getScale() + percentageDragged * (1 - getScale()), 1);
        const borderRadiusValue = 8 - percentageDragged * 8;
        const translateValue = Math.max(0, 14 - percentageDragged * 14);

        setStyle(
          wrapper,
          {
            borderRadius: `${borderRadiusValue}px`,
            transform: isVertical(direction.value)
              ? `scale(${scaleValue}) translate3d(0, ${translateValue}px, 0)`
              : `scale(${scaleValue}) translate3d(${translateValue}px, 0, 0)`,
            transition: 'none',
          },
          true,
        );
      }

      if (!snapPoints.value) {
        const translateValue = absDraggedDistance * directionMultiplier;

        setStyle(drawerRef.value, {
          transform: isVertical(direction.value)
            ? `translate3d(0, ${translateValue}px, 0)`
            : `translate3d(${translateValue}px, 0, 0)`,
        });
      }
    }
  }

  function resetDrawer() {
    if (!drawerRef.value)
      return;
    const wrapper = getDrawerWrapper();
    const currentSwipeAmount = getTranslate(drawerRef.value, isVertical(direction.value) ? 'y' : 'x');

    setStyle(drawerRef.value, {
      transform: 'translate3d(0, 0, 0)',
      transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
    });

    setStyle(overlayRef.value, {
      transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
      opacity: '1',
    });

    // Keep the background scaled if we didn't swipe back down.
    if (shouldScaleBackground.value && currentSwipeAmount && currentSwipeAmount > 0 && open.value) {
      setStyle(
        wrapper,
        {
          borderRadius: `${BORDER_RADIUS}px`,
          overflow: 'hidden',
          ...(isVertical(direction.value)
            ? {
                transform: `scale(${getScale()}) translate3d(0, calc(env(safe-area-inset-top) + 14px), 0)`,
                transformOrigin: 'top',
              }
            : {
                transform: `scale(${getScale()}) translate3d(calc(env(safe-area-inset-top) + 14px), 0, 0)`,
                transformOrigin: 'left',
              }),
          transitionProperty: 'transform, border-radius',
          transitionDuration: `${TRANSITIONS.DURATION}s`,
          transitionTimingFunction: `cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
        },
        true,
      );
    }
  }

  // Flip the shared open state to false; every close side effect (emitClose, the
  // snap-point reset, update:open) is driven off the `open` transition below, so
  // this stays the single place that closes — whatever the trigger (drag, handle,
  // dialog dismissal, or a controlled `v-model:open` flip).
  function closeDrawer() {
    if (!drawerRef.value)
      return;

    open.value = false;
  }

  watchEffect(() => {
    if (!open.value && shouldScaleBackground.value && isClient) {
      // The component is invisible by the time onAnimationEnd would fire, so use a timeout.
      const id = setTimeout(() => {
        resetStyle(document.body);
      }, 200);

      return () => clearTimeout(id);
    }

    return undefined;
  });

  function onRelease(event: PointerEvent) {
    if (!isDragging.value || !drawerRef.value)
      return;

    drawerRef.value.classList.remove(DRAG_CLASS);
    isAllowedToDrag.value = false;
    isDragging.value = false;
    dragEndTime.value = new Date();
    const swipeAmount = getTranslate(drawerRef.value, isVertical(direction.value) ? 'y' : 'x');

    if (!shouldDrag(event.target, false) || !swipeAmount || Number.isNaN(swipeAmount))
      return;

    if (dragStartTime.value === null)
      return;

    const timeTaken = dragEndTime.value.getTime() - dragStartTime.value.getTime();
    const distMoved = pointerStart.value - (isVertical(direction.value) ? event.clientY : event.clientX);
    const velocity = Math.abs(distMoved) / timeTaken;

    if (velocity > 0.05) {
      // Prevents the drawer from focusing an input as the drag ends.
      justReleased.value = true;

      globalThis.setTimeout(() => {
        justReleased.value = false;
      }, 200);
    }

    if (snapPoints.value) {
      const directionMultiplier = direction.value === 'bottom' || direction.value === 'right' ? 1 : -1;

      onReleaseSnapPoints({
        draggedDistance: distMoved * directionMultiplier,
        closeDrawer,
        velocity,
        dismissible: dismissible.value,
      });
      emitRelease(true);
      return;
    }

    // Moved in the open direction → settle back.
    if (direction.value === 'bottom' || direction.value === 'right' ? distMoved > 0 : distMoved < 0) {
      resetDrawer();
      emitRelease(true);
      return;
    }

    if (velocity > VELOCITY_THRESHOLD) {
      closeDrawer();
      emitRelease(false);
      return;
    }

    const visibleDrawerHeight = Math.min(drawerRef.value.getBoundingClientRect().height ?? 0, window.innerHeight);

    if (swipeAmount >= visibleDrawerHeight * closeThreshold.value) {
      closeDrawer();
      emitRelease(false);
      return;
    }

    emitRelease(true);
    resetDrawer();
  }

  // Single owner of open/close side effects. Reacts to every source that writes
  // the shared `open` ref: the drag/handle paths (closeDrawer), the dialog's
  // dismissals (DrawerRoot.handleOpenChange), and a controlled `v-model:open`
  // flip (DrawerRoot's prop watch). `update:open`/`animationEnd` are emitted by
  // DrawerRoot's own watch on the same ref.
  watch(open, (o) => {
    if (o) {
      openTime.value = new Date();
      hasBeenOpened.value = true;
    }
    else {
      emitClose();
      globalThis.setTimeout(() => {
        if (snapPoints.value)
          activeSnapPoint.value = snapPoints.value[0];
      }, TRANSITIONS.DURATION * 1000);
    }
  });

  function onNestedOpenChange(o: boolean) {
    const scale = o ? (window.innerWidth - NESTED_DISPLACEMENT) / window.innerWidth : 1;
    const y = o ? -NESTED_DISPLACEMENT : 0;

    if (nestedOpenChangeTimer.value)
      globalThis.clearTimeout(nestedOpenChangeTimer.value);

    setStyle(drawerRef.value, {
      transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
      transform: `scale(${scale}) translate3d(0, ${y}px, 0)`,
    });

    if (!o && drawerRef.value) {
      nestedOpenChangeTimer.value = globalThis.setTimeout(() => {
        const translateValue = getTranslate(drawerRef.value!, isVertical(direction.value) ? 'y' : 'x');
        setStyle(drawerRef.value, {
          transition: 'none',
          transform: isVertical(direction.value)
            ? `translate3d(0, ${translateValue}px, 0)`
            : `translate3d(${translateValue}px, 0, 0)`,
        });
      }, 500);
    }
  }

  function onNestedDrag(percentageDragged: number) {
    if (percentageDragged < 0)
      return;

    const initialDim = isVertical(direction.value) ? window.innerHeight : window.innerWidth;
    const initialScale = (initialDim - NESTED_DISPLACEMENT) / initialDim;
    const newScale = initialScale + percentageDragged * (1 - initialScale);
    const newTranslate = -NESTED_DISPLACEMENT + percentageDragged * NESTED_DISPLACEMENT;

    setStyle(drawerRef.value, {
      transform: isVertical(direction.value)
        ? `scale(${newScale}) translate3d(0, ${newTranslate}px, 0)`
        : `scale(${newScale}) translate3d(${newTranslate}px, 0, 0)`,
      transition: 'none',
    });
  }

  function onNestedRelease(o: boolean) {
    const dim = isVertical(direction.value) ? window.innerHeight : window.innerWidth;
    const scale = o ? (dim - NESTED_DISPLACEMENT) / dim : 1;
    const translate = o ? -NESTED_DISPLACEMENT : 0;

    if (o) {
      setStyle(drawerRef.value, {
        transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
        transform: isVertical(direction.value)
          ? `scale(${scale}) translate3d(0, ${translate}px, 0)`
          : `scale(${scale}) translate3d(${translate}px, 0, 0)`,
      });
    }
  }

  return {
    open,
    isOpen: open,
    modal,
    keyboardIsOpen,
    hasBeenOpened,
    drawerRef,
    drawerHeightRef,
    overlayRef,
    handleRef,
    isDragging,
    dragStartTime,
    isAllowedToDrag,
    snapPoints,
    activeSnapPoint,
    hasSnapPoints,
    pointerStart,
    dismissible,
    snapPointsOffset,
    direction,
    shouldFade,
    fadeFromIndex,
    shouldScaleBackground,
    setBackgroundColorOnScale,
    onPress,
    onDrag,
    onRelease,
    closeDrawer,
    onNestedDrag,
    onNestedRelease,
    onNestedOpenChange,
    emitClose,
    emitDrag,
    emitRelease,
    nested,
    handleOnly,
    noBodyStyles,
  };
}
