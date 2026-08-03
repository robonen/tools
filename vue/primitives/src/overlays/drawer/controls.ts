import type { Ref } from 'vue';
import { computed, ref, shallowRef, watch, watchEffect } from 'vue';
import { isClient } from '@robonen/platform/multi';
import { getTranslate, resetStyle, setStyle } from '@robonen/platform/browsers';
import { useStateMachine, useTextSelection, useWindowSize } from '@robonen/vue';
import { dampenValue, getDrawerWrapper, getScaleFactor, isVertical, translate3d, translateAxis, writeTransform } from './helpers';
import {
  AXIS_LOCK_DISTANCE,
  BORDER_RADIUS,
  DRAG_CLASS,
  NESTED_DISPLACEMENT,
  TRANSITIONS,
  VELOCITY_THRESHOLD,
} from './constants';
import type { GestureAxis, ReverseCancelTracker, VelocityTracker } from './gesture';
import { computeSettleDuration, createReverseCancelTracker, createVelocityTracker, findScrollableAncestor, isAtScrollEdge } from './gesture';
import { useSnapPoints } from './useSnapPoints';
import { usePositionFixed } from './usePositionFixed';
import type { DrawerRootContext } from './context';
import type { DrawerDirection, DrawerOpenChangeDetails, DrawerOpenChangeReason } from './types';

/** Shared, never-mutated — avoids allocating `{ transition: 'none' }` per drag frame. */
const STYLE_NO_TRANSITION = { transition: 'none' };

export interface WithoutFadeFromProps {
  /**
   * Snap points ordered from least to most visible: fractions (0–1) of the
   * screen, raw pixel numbers (> 1), or `'Npx'`/`'Nrem'` strings — e.g.
   * `[0.2, '148px', 0.8]`.
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
  /**
   * Settle on the snap point adjacent to the active one (one step per gesture)
   * instead of the nearest to where the drag ended.
   * @default false
   */
  snapToSequentialPoints?: boolean;
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
  snapToSequentialPoints: Ref<boolean>;
}

export interface DrawerRootEmits {
  /** Fired continuously during a drag with the fraction (0–1) dragged. */
  (e: 'drag', percentageDragged: number): void;
  /** Fired when the pointer is released, with whether the drawer stays open. */
  (e: 'release', open: boolean): void;
  /** Fired when the drawer begins closing. */
  (e: 'close'): void;
  /** Two-way binding for the open state. `details.reason` says what flipped it. */
  (e: 'update:open', open: boolean, details?: DrawerOpenChangeDetails): void;
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

/**
 * Everything the drag hot path needs, snapshotted once at `onPress` so no
 * pointer-move ever reads layout (`getBoundingClientRect`/`getComputedStyle`),
 * queries the document, or allocates. Discarded on release/cancel.
 */
interface GestureState {
  pointerId: number;
  captureTarget: Element;
  vertical: boolean;
  /** +1 when the dismiss direction increases the client coordinate (bottom/right). */
  multiplier: 1 | -1;
  startX: number;
  startY: number;
  /** Drawer size (px) along the drag axis, measured once at press. */
  size: number;
  /** Window dimension (px) along the drag axis. */
  windowSize: number;
  /** Background-scale factor, cached so drag frames don't read `window.innerWidth`. */
  scale: number;
  /**
   * Inline translate currently applied to the drawer (px, signed). Seeded from
   * the computed style once at press (so a mid-animation grab starts from the
   * on-screen position) and mirrored on every write afterwards — the drag path
   * never reads computed styles.
   */
  translate: number;
  wrapper: HTMLElement | null;
  /** Nearest scrollable ancestor under the pointer along the drag axis. */
  scroller: HTMLElement | null;
  /** Whether the first significant movement has locked the gesture's axis. */
  axisLocked: boolean;
  /** The gesture locked onto the cross axis — never a drawer drag. */
  blocked: boolean;
  velocity: VelocityTracker;
  reverse: ReverseCancelTracker;
  /** Last written overlay opacity (`''` = none yet) — skips redundant writes. */
  lastOverlayOpacity: string;
  /** Last wrapper-scale progress written (`-1` = none yet) — skips redundant writes. */
  lastWrapperProgress: number;
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
    snapToSequentialPoints,
  } = props;

  const hasBeenOpened = ref(open.value);
  const isDragging = ref(false);
  const isAllowedToDrag = ref(false);
  const dragStartTime = ref<number | null>(null);

  const overlayRef = shallowRef<HTMLElement | undefined>(undefined);

  // Timestamps on the `performance.now()` clock (same origin as event.timeStamp).
  let openTime: number | null = null;
  let lastTimeDragPrevented: number | null = null;

  const nestedOpenChangeTimer = ref<number | null>(null);

  const pointerStart = ref(0);
  const keyboardIsOpen = ref(false);

  const drawerRef = shallowRef<HTMLElement | undefined>(undefined);
  const drawerHeightRef = computed(() => drawerRef.value?.getBoundingClientRect().height || 0);

  const snapPoints = usePropOrDefaultRef(props.snapPoints, ref<Array<number | string> | undefined>(undefined));

  const hasSnapPoints = computed(() => !!(snapPoints.value?.length ?? 0));

  const handleRef = shallowRef<HTMLElement | undefined>(undefined);

  // Shared reactive window dimensions (0 during SSR) and text selection — one
  // listener each, reused by the gesture, the scale math, and the snap engine.
  const { width: windowWidth, height: windowHeight } = useWindowSize({ initialWidth: 0, initialHeight: 0 });
  const { text: selectedText } = useTextSelection();

  /** Reason armed for the next open-state flip; consumed by DrawerRoot's emitter. */
  const pendingReason: { current: DrawerOpenChangeReason | undefined } = { current: undefined };

  function armReason(reason: DrawerOpenChangeReason) {
    pendingReason.current = reason;

    // Auto-expire so a dismiss that ends up prevented can't mislabel a later
    // programmatic flip. The open watcher (microtask) always wins this timeout.
    setTimeout(() => {
      if (pendingReason.current === reason)
        pendingReason.current = undefined;
    }, 0);
  }

  const {
    activeSnapPointIndex,
    onRelease: onReleaseSnapPoints,
    snapPointsOffset,
    onDrag: onDragSnapPoints,
    restoreActiveSnapPoint,
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
    snapToSequentialPoints,
    windowWidth,
    windowHeight,
  });

  function onSnapPointChange(activeSnapPointIndex: number, snapPointsOffset: number[]) {
    // Refresh openTime when we reach the last snap point so scrollable content
    // there isn't immediately draggable.
    if (snapPoints.value && activeSnapPointIndex === snapPointsOffset.length - 1)
      openTime = performance.now();
  }

  usePositionFixed({
    isOpen: open,
    modal,
    nested,
    hasBeenOpened,
    noBodyStyles,
    preventScrollRestoration,
  });

  // The drawer's lifecycle as explicit phases. `OPEN`/`CLOSE` are driven by the
  // shared `open` ref below; `SETTLE` arrives from DrawerRoot when the enter/exit
  // animation actually ends (element event or its fallback timeout). Close-side
  // cleanup lives on the `closed` entry hook instead of duration-guessing
  // timeouts: re-opening mid-close moves `closing → opening`, so it can never
  // fire on a live drawer.
  const lifecycle = useStateMachine({
    initial: open.value ? 'open' : 'closed',
    states: {
      closed: {
        entry: () => {
          if (snapPoints.value)
            activeSnapPoint.value = snapPoints.value[0];
        },
        on: { OPEN: 'opening' },
      },
      opening: {
        entry: () => {
          openTime = performance.now();
          hasBeenOpened.value = true;
          // A fast-flick close writes an inline animation-duration override;
          // reopening before that exit settles reuses the SAME element
          // (Presence keeps it alive), so clear the override here or the enter
          // — and any later gentle exit — replays at flick speed.
          drawerRef.value?.style.removeProperty('animation-duration');
          overlayRef.value?.style.removeProperty('animation-duration');
        },
        on: { SETTLE: 'open', CLOSE: 'closing' },
      },
      open: { on: { CLOSE: 'closing' } },
      closing: { on: { SETTLE: 'closed', OPEN: 'opening' } },
    },
  });

  let gesture: GestureState | null = null;

  function shouldDrag(el: EventTarget | null, isDraggingInDirection: boolean, now: number): boolean {
    const g = gesture!;

    if (!el)
      return false;

    const element = el as HTMLElement;

    if (element.closest?.('[data-drawer-no-drag]'))
      return false;

    // Allow scrolling during the open animation.
    if (openTime !== null && now - openTime < 500)
      return false;

    // Partially hidden (a snap point below fully open, or a mid-animation
    // grab) — the drawer is always draggable.
    const swipeAmount = g.translate;

    if (g.multiplier === 1 ? swipeAmount > 0 : swipeAmount < 0)
      return true;

    // Don't drag when text is selected (reactive — no per-move getSelection).
    if (selectedText.value.length > 0)
      return false;

    // Don't drag right after scrolling inside the drawer.
    if (
      lastTimeDragPrevented !== null
      && now - lastTimeDragPrevented < scrollLockTimeout.value
      && swipeAmount === 0
    ) {
      lastTimeDragPrevented = now;
      return false;
    }

    if (isDraggingInDirection) {
      lastTimeDragPrevented = now;
      // Dragging in the open direction → allow scrolling instead.
      return false;
    }

    // A scroll container under the pointer owns the gesture unless it already
    // sits at the edge the dismiss direction pulls away from.
    if (g.scroller && !isAtScrollEdge(g.scroller, direction.value)) {
      lastTimeDragPrevented = now;
      return false;
    }

    return true;
  }

  function onPress(event: PointerEvent, captureTarget?: HTMLElement) {
    // One gesture at a time; a second touch never steals an active drag. But a
    // gesture whose capture element left the DOM can never finish (its
    // lostpointercapture fires at the document, past our listeners) — reclaim
    // it instead of wedging every future drag.
    if (gesture) {
      if (gesture.captureTarget.isConnected)
        return;

      gesture = null;
      isAllowedToDrag.value = false;
      isDragging.value = false;
      drawerRef.value?.classList.remove(DRAG_CLASS);
    }
    if (!dismissible.value && !snapPoints.value)
      return;
    if (event.button > 0)
      return;

    const el = drawerRef.value;

    if (!el || !el.contains(event.target as Node))
      return;

    const vertical = isVertical(direction.value);
    const axis: GestureAxis = vertical ? 'y' : 'x';
    const rect = el.getBoundingClientRect();
    // Capture on the pressed element, never the drawer: while a capture is
    // active the compat mouse events retarget to the capturing element, so
    // capturing on the drawer would swallow `click` for every control inside it.
    const capture = captureTarget ?? (event.target as Element);

    // Synthetic pointers (tests) and already-released pointers have no active
    // pointer id to capture — the drag still works, only retargeting is lost.
    try {
      capture.setPointerCapture(event.pointerId);
    }
    catch {
      // No active pointer to capture — the drag still works, only retargeting is lost.
    }

    isDragging.value = true;
    dragStartTime.value = event.timeStamp;
    pointerStart.value = vertical ? event.clientY : event.clientX;

    gesture = {
      pointerId: event.pointerId,
      captureTarget: capture,
      vertical,
      multiplier: direction.value === 'bottom' || direction.value === 'right' ? 1 : -1,
      startX: event.clientX,
      startY: event.clientY,
      size: (vertical ? rect.height : rect.width) || 0,
      windowSize: vertical ? windowHeight.value : windowWidth.value,
      scale: getScaleFactor(windowWidth.value),
      // The one intentional computed-style read of the gesture: catches the
      // drawer mid-animation so the drag continues from the on-screen position.
      translate: getTranslate(el, axis) ?? 0,
      wrapper: getDrawerWrapper(),
      scroller: findScrollableAncestor(event.target as Element, el, axis),
      axisLocked: false,
      blocked: false,
      velocity: createVelocityTracker(),
      reverse: createReverseCancelTracker(),
      lastOverlayOpacity: '',
      lastWrapperProgress: -1,
    };
  }

  function onDrag(event: PointerEvent) {
    const g = gesture;

    if (!g || event.pointerId !== g.pointerId || !isDragging.value || g.blocked || !drawerRef.value)
      return;

    const dx = event.clientX - g.startX;
    const dy = event.clientY - g.startY;

    // Lock onto an axis on the first significant movement. A gesture that
    // locks onto the cross axis is a scroll/pan — never a drawer drag.
    if (!g.axisLocked) {
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (absX < AXIS_LOCK_DISTANCE && absY < AXIS_LOCK_DISTANCE)
        return;

      g.axisLocked = true;

      if ((absX > absY) === g.vertical) {
        g.blocked = true;
        return;
      }
    }

    g.velocity.add(g.vertical ? event.clientY : event.clientX, event.timeStamp);

    const draggedDistance = (g.vertical ? g.startY - event.clientY : g.startX - event.clientX) * g.multiplier;
    const isDraggingInDirection = draggedDistance > 0;

    // Dismiss-positive displacement feeds the "changed my mind" detector.
    g.reverse.update(-draggedDistance);

    // Don't allow dragging toward close past the first snap point when not dismissible.
    const noCloseSnapPointsPreCondition = snapPoints.value && !dismissible.value && !isDraggingInDirection;

    if (noCloseSnapPointsPreCondition && activeSnapPointIndex.value === 0)
      return;

    const absDraggedDistance = Math.abs(draggedDistance);

    // 1 means the closed position. Size cached at drag start (no reflow).
    let percentageDragged = absDraggedDistance / (g.size || 1);
    const snapPointPercentageDragged = getSnapPointsPercentageDragged(absDraggedDistance, isDraggingInDirection);

    if (snapPointPercentageDragged !== null)
      percentageDragged = snapPointPercentageDragged;

    if (noCloseSnapPointsPreCondition && percentageDragged >= 1)
      return;

    // Decide-to-drag gate + one-time gesture setup. Once allowed, stay allowed
    // for the whole gesture, so the class add + transition writes fire ONCE,
    // not on every move.
    if (!isAllowedToDrag.value) {
      if (!shouldDrag(event.target, isDraggingInDirection, event.timeStamp))
        return;
      isAllowedToDrag.value = true;
      drawerRef.value.classList.add(DRAG_CLASS);
      setStyle(drawerRef.value, STYLE_NO_TRANSITION);
      setStyle(overlayRef.value, STYLE_NO_TRANSITION);
    }

    if (snapPoints.value) {
      const applied = onDragSnapPoints({ draggedDistance });

      if (applied !== null)
        g.translate = applied;
    }

    // Rubber-band past the open position when there are no snap points.
    if (isDraggingInDirection && !snapPoints.value) {
      const dampenedDraggedDistance = dampenValue(draggedDistance);
      const translateValue = Math.min(dampenedDraggedDistance * -1, 0) * g.multiplier;

      writeTransform(drawerRef.value, translateAxis(g.vertical, translateValue));
      g.translate = translateValue;
      return;
    }

    if (shouldFade.value || (fadeFromIndex.value && activeSnapPointIndex.value === fadeFromIndex.value - 1)) {
      emitDrag(percentageDragged);

      const overlay = overlayRef.value;
      const opacity = `${1 - percentageDragged}`;

      if (overlay && opacity !== g.lastOverlayOpacity) {
        g.lastOverlayOpacity = opacity;
        overlay.style.opacity = opacity;
        overlay.style.transition = 'none';
      }
    }

    if (g.wrapper && overlayRef.value && shouldScaleBackground.value && percentageDragged !== g.lastWrapperProgress) {
      g.lastWrapperProgress = percentageDragged;

      const scaleValue = Math.min(g.scale + percentageDragged * (1 - g.scale), 1);
      const borderRadiusValue = 8 - percentageDragged * 8;
      const translateValue = Math.max(0, 14 - percentageDragged * 14);
      const style = g.wrapper.style;

      style.borderRadius = `${borderRadiusValue}px`;
      style.transform = g.vertical
        ? `scale(${scaleValue}) translate3d(0, ${translateValue}px, 0)`
        : `scale(${scaleValue}) translate3d(${translateValue}px, 0, 0)`;
      style.transition = 'none';
    }

    if (!snapPoints.value) {
      const translateValue = absDraggedDistance * g.multiplier;

      writeTransform(drawerRef.value, translateAxis(g.vertical, translateValue));
      g.translate = translateValue;
    }
  }

  function resetDrawer(duration: number = TRANSITIONS.DURATION, currentSwipeAmount?: number | null) {
    if (!drawerRef.value)
      return;
    const wrapper = getDrawerWrapper();
    const swipeAmount = currentSwipeAmount
      ?? getTranslate(drawerRef.value, isVertical(direction.value) ? 'y' : 'x');
    const ease = `cubic-bezier(${TRANSITIONS.EASE.join(',')})`;

    setStyle(drawerRef.value, {
      transform: 'translate3d(0, 0, 0)',
      transition: `transform ${duration}s ${ease}`,
    });

    setStyle(overlayRef.value, {
      transition: `opacity ${duration}s ${ease}`,
      opacity: '1',
    });

    // Keep the background scaled if we didn't swipe back down.
    if (shouldScaleBackground.value && swipeAmount && swipeAmount > 0 && open.value) {
      setStyle(
        wrapper,
        {
          borderRadius: `${BORDER_RADIUS}px`,
          overflow: 'hidden',
          ...(isVertical(direction.value)
            ? {
                transform: `scale(${getScaleFactor(windowWidth.value)}) translate3d(0, calc(env(safe-area-inset-top) + 14px), 0)`,
                transformOrigin: 'top',
              }
            : {
                transform: `scale(${getScaleFactor(windowWidth.value)}) translate3d(calc(env(safe-area-inset-top) + 14px), 0, 0)`,
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
  function closeDrawer(reason?: DrawerOpenChangeReason) {
    if (!drawerRef.value)
      return;

    if (reason)
      armReason(reason);

    open.value = false;
  }

  /**
   * Close via the exit keyframes, scaled to the fling: the inline
   * `animation-duration` overrides the stylesheet's 0.5s so a hard flick
   * finishes in as little as 80ms. A reopen before the exit settles reuses the
   * same element (Presence holds it), so the `opening` entry hook clears the
   * override before the enter plays.
   */
  function closeWithSettle(remainingDistance: number, velocity: number) {
    const duration = computeSettleDuration(remainingDistance, velocity);

    if (duration !== TRANSITIONS.DURATION) {
      const durationValue = `${duration}s`;

      if (drawerRef.value)
        drawerRef.value.style.animationDuration = durationValue;
      if (overlayRef.value)
        overlayRef.value.style.animationDuration = durationValue;
    }

    closeDrawer('swipe');
  }

  function endGesture(event: PointerEvent): GestureState | null {
    const g = gesture;

    if (!g || event.pointerId !== g.pointerId)
      return null;

    gesture = null;
    drawerRef.value?.classList.remove(DRAG_CLASS);

    try {
      g.captureTarget.releasePointerCapture(event.pointerId);
    }
    catch {
      // Capture was never acquired (synthetic pointer) or already released.
    }

    const wasAllowed = isAllowedToDrag.value;

    isAllowedToDrag.value = false;
    isDragging.value = false;

    return wasAllowed ? g : null;
  }

  function onRelease(event: PointerEvent) {
    if (!isDragging.value || !drawerRef.value) {
      endGesture(event);
      return;
    }

    const g = endGesture(event);

    if (!g)
      return;

    const swipeAmount = g.translate;
    const cancelled = g.reverse.cancelled;
    const rawVelocity = g.velocity.read(event.timeStamp);
    const velocityToDismiss = cancelled ? 0 : rawVelocity * g.multiplier;
    const distMoved = g.vertical ? g.startY - event.clientY : g.startX - event.clientX;
    const draggedDistance = distMoved * g.multiplier;

    if (snapPoints.value) {
      onReleaseSnapPoints({
        draggedDistance,
        closeDrawer: () => closeDrawer('swipe'),
        velocity: velocityToDismiss,
        dismissible: dismissible.value,
        drawerSize: g.size,
      });
      emitRelease(true);
      return;
    }

    // Moved toward open, or pulled back to cancel → settle into place.
    if (draggedDistance > 0 || cancelled) {
      resetDrawer(computeSettleDuration(Math.abs(swipeAmount), rawVelocity), swipeAmount);
      emitRelease(true);
      return;
    }

    const dismissTravel = swipeAmount * g.multiplier;
    const remaining = Math.max(g.size - dismissTravel, 0);

    if (velocityToDismiss > VELOCITY_THRESHOLD) {
      closeWithSettle(remaining, velocityToDismiss);
      emitRelease(false);
      return;
    }

    const visibleSize = Math.min(g.size || 0, g.windowSize);

    if (dismissTravel >= visibleSize * closeThreshold.value) {
      closeWithSettle(remaining, velocityToDismiss);
      emitRelease(false);
      return;
    }

    emitRelease(true);
    resetDrawer(computeSettleDuration(dismissTravel, rawVelocity), swipeAmount);
  }

  function onCancel(event: PointerEvent) {
    const g = endGesture(event);

    if (!g)
      return;

    // A cancelled pointer is not a user decision — settle back where the
    // drawer was, never close.
    if (snapPoints.value)
      restoreActiveSnapPoint();
    else
      resetDrawer(TRANSITIONS.DURATION, g.translate);

    emitRelease(true);
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

  // Single owner of open/close side effects. Reacts to every source that writes
  // the shared `open` ref: the drag/handle paths (closeDrawer), the dialog's
  // dismissals (DrawerRoot.handleOpenChange), and a controlled `v-model:open`
  // flip (DrawerRoot's prop watch). `update:open`/`animationEnd` are emitted by
  // DrawerRoot's own watch on the same ref; everything else rides the lifecycle
  // machine's entry hooks.
  watch(open, (o) => {
    if (o) {
      lifecycle.send('OPEN');
    }
    else {
      emitClose();
      lifecycle.send('CLOSE');
    }
  });

  function onNestedOpenChange(o: boolean) {
    const scale = o ? (windowWidth.value - NESTED_DISPLACEMENT) / windowWidth.value : 1;
    const y = o ? -NESTED_DISPLACEMENT : 0;

    if (nestedOpenChangeTimer.value)
      clearTimeout(nestedOpenChangeTimer.value);

    setStyle(drawerRef.value, {
      transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
      transform: `scale(${scale}) translate3d(0, ${y}px, 0)`,
    });

    if (!o && drawerRef.value) {
      nestedOpenChangeTimer.value = setTimeout(() => {
        const translateValue = getTranslate(drawerRef.value!, isVertical(direction.value) ? 'y' : 'x');
        setStyle(drawerRef.value, {
          transition: 'none',
          transform: translate3d(direction.value, translateValue ?? 0),
        });
      }, 500);
    }
  }

  function onNestedDrag(percentageDragged: number) {
    if (percentageDragged < 0)
      return;

    const el = drawerRef.value;

    if (!el)
      return;

    const initialDim = isVertical(direction.value) ? windowHeight.value : windowWidth.value;
    const initialScale = (initialDim - NESTED_DISPLACEMENT) / initialDim;
    const newScale = initialScale + percentageDragged * (1 - initialScale);
    const newTranslate = -NESTED_DISPLACEMENT + percentageDragged * NESTED_DISPLACEMENT;

    // Per-frame path (driven by the child's drag) — direct writes, no setStyle.
    el.style.transform = isVertical(direction.value)
      ? `scale(${newScale}) translate3d(0, ${newTranslate}px, 0)`
      : `scale(${newScale}) translate3d(${newTranslate}px, 0, 0)`;
    el.style.transition = 'none';
  }

  function onNestedRelease(o: boolean) {
    const dim = isVertical(direction.value) ? windowHeight.value : windowWidth.value;
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
    phase: lifecycle.state,
    notifySettled: () => {
      lifecycle.send('SETTLE');
    },
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
    onCancel,
    closeDrawer,
    armReason,
    pendingReason,
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
