import type { ComputedRef, DeepReadonly, MaybeRefOrGetter, Ref } from 'vue';
import { onScopeDispose, readonly, shallowReadonly, shallowRef, toValue } from 'vue';
import { useEventListener } from '@robonen/vue';
import { computeFrame, resolveAxisLock } from './computeFrame';
import { capturePointer, releasePointer } from './dom';
import type { DragAxis, DragBounds, DragModifiers, DragState, Point } from './types';

/** Options for {@link usePointerDrag}. */
export interface UsePointerDragOptions {
  /** Axis the drag is constrained to. @default 'both' */
  axis?: DragAxis;
  /** When `axis` is `'both'`, holding shift locks to the dominant axis. @default false */
  lockAxisOnShift?: boolean;
  /** Pixels the pointer must travel before a press becomes a drag. @default 3 */
  threshold?: number;
  /**
   * Snap the cumulative total to a grid. A scalar applies to both axes; a
   * `[gx, gy]` tuple snaps each axis independently. `undefined` disables snapping.
   */
  snapGrid?: MaybeRefOrGetter<number | [number, number] | undefined>;
  /** Optional per-axis clamp applied to the cumulative total. */
  bounds?: MaybeRefOrGetter<DragBounds | undefined>;
  /** Cache the tracked element's rect on pointerdown so `elementPoint` is populated. @default false */
  trackElementRect?: boolean;
  /** Supply the rect explicitly (falls back to `target.getBoundingClientRect()`). */
  getRect?: () => DOMRect | undefined;
  /** Restrict which pointer types start a drag. When omitted, all types are accepted. */
  pointerTypes?: Array<'mouse' | 'touch' | 'pen'>;
  /** Mouse buttons that start a drag (matched against `event.button`). @default [0] */
  buttons?: MaybeRefOrGetter<number[]>;
  /** Reject new pointerdowns while truthy (does not abort an active gesture). @default false */
  disabled?: MaybeRefOrGetter<boolean>;
  /** Call `preventDefault()` on the initiating pointerdown. @default true */
  preventDefault?: MaybeRefOrGetter<boolean>;
  /** Call `stopPropagation()` on the initiating pointerdown. @default false */
  stopPropagation?: MaybeRefOrGetter<boolean>;
  /**
   * Fired once when the threshold is first crossed. Return `false` to abort the
   * gesture (the capture is released and state reset for a clean re-press).
   */
  onStart?: (state: DragState, event: PointerEvent) => void | false;
  /** Fired every committed frame while dragging. */
  onMove?: (state: DragState, event: PointerEvent) => void;
  /** Fired on pointerup or pointercancel. Inspect `event.type` to tell them apart. */
  onEnd?: (state: DragState, event: PointerEvent) => void;
  /** Fired after `onEnd` on a successful pointerup only (never on cancel/abort). */
  onCommit?: (state: DragState) => void;
}

/** Return value of {@link usePointerDrag}. */
export interface UsePointerDragReturn {
  /** Whether a drag is currently in progress (threshold crossed). */
  isDragging: Readonly<Ref<boolean>>;
  /** The reactive drag state (read-only view). */
  state: DeepReadonly<DragState>;
  /** The cumulative total of the latest frame. */
  total: ComputedRef<Point>;
  /** The per-frame delta of the latest frame. */
  delta: ComputedRef<Point>;
  /** The latest modifier flags (read-only view). */
  modifiers: Readonly<DragModifiers>;
  /** Imperatively abort an active gesture (fires `onEnd`, never `onCommit`). */
  cancel: () => void;
}

/** Frozen zero point reused for resetting state. */
function zero(): Point {
  return { x: 0, y: 0 };
}

/**
 * Normalized pointer-capture drag composable. The single drag primitive every
 * draggable media-editor control builds on.
 *
 * Binds `pointerdown` to `target`, captures the pointer on press, and retargets
 * `pointermove` / `pointerup` / `pointercancel` to the same element (capture
 * invariant: capture node === listen node). Pointer moves are coalesced into
 * exactly one `requestAnimationFrame` flush per event burst, where the frame is
 * computed via {@link computeFrame} (axis lock → snap → clamp) and the reactive
 * state updated once. A press that never crosses `threshold` stays a click:
 * `isDragging` never flips and `onStart`/`onMove`/`onCommit` never fire.
 *
 * @param target The element (ref/getter) that owns the drag. A lazy getter
 *   rebinds the listener when a template ref resolves.
 * @param options See {@link UsePointerDragOptions}.
 */
export function usePointerDrag(
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
  options: UsePointerDragOptions = {},
): UsePointerDragReturn {
  const {
    axis = 'both',
    lockAxisOnShift = false,
    threshold = 3,
    snapGrid,
    bounds,
    trackElementRect = false,
    getRect,
    pointerTypes,
    buttons,
    disabled,
    preventDefault,
    stopPropagation,
    onStart,
    onMove,
    onEnd,
    onCommit,
  } = options;

  const isDragging = shallowRef(false);

  // Plain (non-reactive) object. `flush()` writes ~13 of these fields every frame;
  // as a `reactive()` proxy each write was a subscriber-less trigger + Proxy
  // set-trap on the package's single shared drag primitive. Nothing reads these
  // outputs reactively — consumers bind to `isDragging` (a shallowRef) and read
  // `state` imperatively inside onMove/onStart/onEnd — so a plain object is the
  // correct representation and removes the per-frame reactivity cost everywhere.
  const state: DragState = {
    startPoint: zero(),
    point: zero(),
    elementPoint: zero(),
    delta: zero(),
    total: zero(),
    axis: axis === 'both' ? 'none' : axis,
    modifiers: { shift: false, alt: false, ctrl: false, meta: false },
    pointerId: -1,
    pointerType: '',
  };

  // ── gesture-local mutable state (plain locals, not reactive) ──────────────
  let pointerId = -1;
  /** Gesture origin in client pixels. */
  const start: Point = zero();
  /** Latest pointer position in client pixels. */
  const last: Point = zero();
  /** Last committed total — `delta` is derived against this each frame. */
  const prevTotal: Point = zero();
  let rect: DOMRect | undefined;
  /** Threshold crossed (drag begun). Gates `onStart`/`onMove`/`onCommit`. */
  let started = false;
  /** Gesture torn down. Makes `endDrag` idempotent across up/cancel/dispose. */
  let ended = false;
  let rafId: number | null = null;
  /** Latest move event awaiting the next rAF flush. */
  let pendingEvent: PointerEvent | null = null;
  /** The window the gesture-scoped move/up/cancel listeners are attached to. */
  let activeWindow: Window | null = null;

  function setModifiers(event: PointerEvent): void {
    state.modifiers.shift = event.shiftKey;
    state.modifiers.alt = event.altKey;
    state.modifiers.ctrl = event.ctrlKey;
    state.modifiers.meta = event.metaKey;
  }

  function resolvedTarget(): HTMLElement | undefined {
    return toValue(target) ?? undefined;
  }

  /**
   * Compute the frame for `pendingEvent` and push it into reactive state.
   * Single stash-and-flush rather than `useRafFn`: `useRafFn` runs a *continuous*
   * loop, but a drag wants exactly one frame per pointer-event burst — so we
   * coalesce moves into a single rAF and never spin when the pointer is still.
   */
  function flush(): void {
    rafId = null;
    const event = pendingEvent;
    if (!event) return;
    pendingEvent = null;

    // Read modifiers live off the event (not `useKeyModifier`): an in-event read
    // is the only source guaranteed correct for THIS frame's gesture decision.
    setModifiers(event);

    const rawTotal: Point = { x: last.x - start.x, y: last.y - start.y };
    const effectiveAxis = resolveAxisLock(axis, lockAxisOnShift, state.modifiers, rawTotal);

    const frame = computeFrame({
      start,
      last,
      rect,
      axis: effectiveAxis,
      snapGrid: toValue(snapGrid),
      bounds: toValue(bounds),
      prevTotal,
    });

    prevTotal.x = frame.total.x;
    prevTotal.y = frame.total.y;

    state.point.x = last.x;
    state.point.y = last.y;
    state.elementPoint.x = frame.elementPoint.x;
    state.elementPoint.y = frame.elementPoint.y;
    state.delta.x = frame.delta.x;
    state.delta.y = frame.delta.y;
    state.total.x = frame.total.x;
    state.total.y = frame.total.y;
    state.axis = effectiveAxis;

    if (!isDragging.value) isDragging.value = true;

    onMove?.(state as DragState, event);
  }

  function schedule(): void {
    if (rafId === null) rafId = requestAnimationFrame(flush);
  }

  function cancelRaf(): void {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  const onUp = (event: PointerEvent): void => endDrag(event, true);
  const onCancel = (event: PointerEvent): void => endDrag(event, false);

  /**
   * Attach move/up/cancel to `window` (the element's own window, so iframes work)
   * for the duration of the gesture. Catching these on `window` rather than the
   * target means a re-rendered target or a lost `setPointerCapture` can never
   * strand the gesture — the up always arrives. Listeners are gesture-scoped, so
   * idle instances cost nothing.
   */
  function addWindowListeners(): void {
    const win = resolvedTarget()?.ownerDocument?.defaultView
      ?? (globalThis.window !== undefined ? globalThis : null);
    if (!win) return;
    win.addEventListener('pointermove', onPointerMove);
    win.addEventListener('pointerup', onUp);
    win.addEventListener('pointercancel', onCancel);
    activeWindow = win;
  }

  function removeWindowListeners(): void {
    if (!activeWindow) return;
    activeWindow.removeEventListener('pointermove', onPointerMove);
    activeWindow.removeEventListener('pointerup', onUp);
    activeWindow.removeEventListener('pointercancel', onCancel);
    activeWindow = null;
  }

  /** Tear down gesture-local state without firing any callbacks. */
  function reset(): void {
    removeWindowListeners();
    cancelRaf();
    pendingEvent = null;
    pointerId = -1;
    rect = undefined;
    started = false;
    ended = true;
    isDragging.value = false;
    state.pointerId = -1;
    state.pointerType = '';
    state.axis = axis === 'both' ? 'none' : axis;
    prevTotal.x = 0;
    prevTotal.y = 0;
  }

  function onPointerDown(event: PointerEvent): void {
    // A live gesture owns the pointer; ignore re-entrant downs.
    if (pointerId !== -1) return;
    if (toValue(disabled) ?? false) return;

    const acceptedButtons = toValue(buttons) ?? [0];
    if (!acceptedButtons.includes(event.button)) return;
    if (pointerTypes && !pointerTypes.includes(event.pointerType as 'mouse' | 'touch' | 'pen')) return;

    const el = resolvedTarget();

    if (toValue(preventDefault) ?? true) event.preventDefault();
    if (toValue(stopPropagation) ?? false) event.stopPropagation();

    pointerId = event.pointerId;
    start.x = last.x = event.clientX;
    start.y = last.y = event.clientY;
    prevTotal.x = 0;
    prevTotal.y = 0;
    started = false;
    ended = false;

    rect = (trackElementRect || getRect)
      ? (getRect?.() ?? el?.getBoundingClientRect())
      : undefined;

    state.startPoint.x = start.x;
    state.startPoint.y = start.y;
    state.point.x = start.x;
    state.point.y = start.y;
    state.elementPoint.x = rect ? start.x - rect.left : 0;
    state.elementPoint.y = rect ? start.y - rect.top : 0;
    state.delta.x = 0;
    state.delta.y = 0;
    state.total.x = 0;
    state.total.y = 0;
    state.axis = axis === 'both' ? 'none' : axis;
    state.pointerId = event.pointerId;
    state.pointerType = event.pointerType;
    setModifiers(event);

    capturePointer(el, event.pointerId);
    addWindowListeners();

    // threshold 0 → engage immediately; otherwise wait for the first qualifying
    // move. `beginDrag` may abort (onStart === false) and self-unwind.
    if (threshold === 0) beginDrag(event);
  }

  /**
   * Cross the threshold: fire `onStart`. Returns `false` (and fully unwinds) if
   * the consumer aborts — so an immediate re-press starts clean.
   */
  function beginDrag(event: PointerEvent): boolean {
    started = true;
    if (onStart?.(state as DragState, event) === false) {
      releasePointer(resolvedTarget(), pointerId);
      reset();
      return false;
    }
    // The gesture has begun (threshold crossed / `threshold: 0`). `flush` also
    // sets this on the first frame; the assignment here is idempotent and makes
    // `isDragging` true the instant `onStart` is accepted, even before a move.
    isDragging.value = true;
    return true;
  }

  function onPointerMove(event: PointerEvent): void {
    // Multi-touch guard: only the locked pointer drives the gesture.
    if (event.pointerId !== pointerId) return;
    last.x = event.clientX;
    last.y = event.clientY;

    if (!started) {
      if (Math.abs(last.x - start.x) < threshold && Math.abs(last.y - start.y) < threshold) return;
      if (!beginDrag(event)) return;
    }

    pendingEvent = event;
    schedule();
  }

  /**
   * Idempotent end-of-gesture. `commit` distinguishes a real pointerup (commit)
   * from a cancel/abort (no commit). The `ended` guard means pointerup,
   * pointercancel, `onScopeDispose`, and synthetic test events can't double-fire.
   */
  function endDrag(event: PointerEvent | null, commit: boolean): void {
    if (ended) return;
    if (event && event.pointerId !== pointerId) return;
    ended = true;

    cancelRaf();

    // Final synchronous flush so the last sub-frame move is never dropped.
    if (event && pendingEvent) flush();

    isDragging.value = false;

    if (started && event) {
      onEnd?.(state as DragState, event);
      if (commit) onCommit?.(state as DragState);
    }

    removeWindowListeners();
    releasePointer(resolvedTarget(), pointerId);
    pointerId = -1;
    rect = undefined;
    started = false;
    pendingEvent = null;
  }

  /** Lazy getter target so the listener rebinds when a template ref resolves. */
  const targetGetter = () => resolvedTarget() ?? null;

  // Only pointerdown lives on the target; move/up/cancel are added to `window`
  // for the duration of the gesture (see addWindowListeners) so a re-rendered
  // target or a lost pointer-capture can never strand the gesture.
  useEventListener(targetGetter, 'pointerdown', onPointerDown);

  onScopeDispose(() => {
    // Treat teardown like a cancel: release + cancel rAF, no commit.
    cancelRaf();
    removeWindowListeners();
    if (pointerId !== -1) releasePointer(resolvedTarget(), pointerId);
  });

  function cancel(): void {
    // Imperative abort: fire onEnd (synthesizing a cancel-shaped event) but
    // never onCommit.
    if (ended || pointerId === -1) return;
    const el = resolvedTarget();
    const synthetic = new PointerEvent('pointercancel', { pointerId });
    cancelRaf();
    removeWindowListeners();
    ended = true;
    isDragging.value = false;
    if (started) onEnd?.(state as DragState, synthetic);
    releasePointer(el, pointerId);
    pointerId = -1;
    rect = undefined;
    started = false;
    pendingEvent = null;
  }

  return {
    isDragging,
    state: readonly(state),
    // Live read-the-latest views over the plain state (intentionally NOT reactive
    // computeds — `state` no longer triggers, and nothing subscribes to these).
    // Each `.value` read returns a fresh snapshot, matching the previous behaviour.
    total: { get value() { return { x: state.total.x, y: state.total.y }; } } as unknown as ComputedRef<Point>,
    delta: { get value() { return { x: state.delta.x, y: state.delta.y }; } } as unknown as ComputedRef<Point>,
    modifiers: shallowReadonly(state.modifiers),
    cancel,
  };
}
