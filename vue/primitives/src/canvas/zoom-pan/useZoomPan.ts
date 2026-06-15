import type { Ref } from 'vue';
import { computed, onScopeDispose, shallowRef } from 'vue';
import { useEventListener } from '@robonen/vue';
import { usePointerDrag } from '../../internal/pointer-drag';
import type { DragAxis } from '../../internal/pointer-drag';
import type { Viewport, ViewportContext, ZoomPanAxis, ZoomPanOptions } from './types';
import { clampZoom, wheelToZoomFactor, zoomAtPointer } from './utils';

/** Return value of {@link useZoomPan}. */
export interface UseZoomPanReturn {
  /** True while a drag-pan / scroll-pan gesture is active. */
  isPanning: Readonly<Ref<boolean>>;
  /** True while a wheel / pinch / dblclick zoom gesture is active. */
  isZooming: Readonly<Ref<boolean>>;
}

/** Map the public `'xy' | 'x' | 'y'` axis onto `usePointerDrag`'s `DragAxis`. */
function toDragAxis(axis: ZoomPanAxis): DragAxis {
  return axis === 'xy' ? 'both' : axis;
}

/** True when the activation key (if any) is held for the given event. */
function activationHeld(event: WheelEvent, key: ZoomPanOptions['zoomActivationKey']): boolean {
  switch (key) {
    case null:
    case undefined: return true;
    case 'Alt': return event.altKey;
    case 'Control': return event.ctrlKey;
    case 'Meta': return event.metaKey;
    case 'Shift': return event.shiftKey;
  }
}

const EDITABLE = /^(?:input|textarea|select)$/i;

/**
 * Unit pan directions per arrow key (screen-space, before `step` scaling).
 * Module-scope so the keydown handler allocates nothing on the non-arrow miss
 * path and never rebuilds the table per event during OS key-repeat panning.
 */
const ARROW_UNITS: Record<string, readonly [number, number]> = {
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
  ArrowLeft: [1, 0],
  ArrowRight: [-1, 0],
};

/** True when focus is in a text field, so global shortcuts must stand down. */
function isTyping(): boolean {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (EDITABLE.test(el.tagName) || el.isContentEditable);
}

/**
 * Wires wheel zoom-at-pointer, pinch, optional scroll-pan, drag-pan, double-click
 * zoom, and a keyboard pan/zoom layer onto `target`, writing the master
 * `ctx.viewport` through one RAF-batched flush per frame so a burst of
 * wheel/pointer events never causes more than one layout write. Every scheduled
 * value passes through axis-lock + `ctx.clampViewport`.
 *
 * Generalised from flow's `usePanZoom`: reads/writes a plain `Ref<Viewport>`
 * (via the context) and is parameterised by `axis` + constraints rather than
 * being bound to a flow graph. Crucially, `wheel` only `preventDefault`s when it
 * actually consumes the delta — so an axis-locked or boundary-clamped surface
 * embedded in a scrollable page does not swallow page scroll it ignored.
 *
 * @param target The interaction surface element (ref).
 * @param ctx The viewport context.
 * @param options Behaviour switches (usually `ctx.options.value`).
 * @returns `{ isPanning, isZooming }`.
 */
export function useZoomPan(
  target: Ref<HTMLElement | undefined>,
  ctx: ViewportContext,
  options: ZoomPanOptions = {},
): UseZoomPanReturn {
  const opts = computed<Required<Pick<ZoomPanOptions,
    'axis' | 'panOnDrag' | 'zoomOnScroll' | 'zoomOnPinch' | 'panOnScroll' | 'panOnScrollSpeed'
    | 'zoomOnDoubleClick' | 'doubleClickZoomFactor' | 'disabled' | 'disableKeyboard' | 'keyboardPanStep'>>
    & Pick<ZoomPanOptions, 'zoomActivationKey'>>(() => ({
    axis: options.axis ?? ctx.axis.value,
    panOnDrag: options.panOnDrag ?? true,
    zoomOnScroll: options.zoomOnScroll ?? true,
    zoomOnPinch: options.zoomOnPinch ?? true,
    panOnScroll: options.panOnScroll ?? false,
    panOnScrollSpeed: options.panOnScrollSpeed ?? 0.5,
    zoomOnDoubleClick: options.zoomOnDoubleClick ?? true,
    doubleClickZoomFactor: options.doubleClickZoomFactor ?? 1.2,
    zoomActivationKey: options.zoomActivationKey ?? null,
    disabled: options.disabled ?? false,
    disableKeyboard: options.disableKeyboard ?? false,
    keyboardPanStep: options.keyboardPanStep ?? 20,
  }));

  /** Master enable: locked when the root is non-interactive or `disabled`. */
  function enabled(): boolean {
    return ctx.interactive.value && !opts.value.disabled;
  }

  const isPanning = shallowRef(false);
  const isZooming = shallowRef(false);

  // ── axis lock + clamp helper ──────────────────────────────────────────────
  /**
   * Apply the axis lock against `base` (so a locked axis keeps its current
   * value), then clamp. Every scheduled viewport goes through here.
   */
  function constrain(next: Viewport, base: Viewport): Viewport {
    const axis = opts.value.axis;
    const locked: Viewport = {
      zoom: next.zoom,
      x: axis === 'y' ? base.x : next.x,
      y: axis === 'x' ? base.y : next.y,
    };
    return ctx.clampViewport(locked);
  }

  // ── RAF-batched viewport writes ───────────────────────────────────────────
  let rafId: number | null = null;
  let pending: Viewport | null = null;

  function flush(): void {
    rafId = null;
    if (pending) {
      ctx.viewport.value = pending;
      pending = null;
    }
  }

  function schedule(next: Viewport, base: Viewport): void {
    pending = constrain(next, base);
    if (rafId === null) rafId = requestAnimationFrame(flush);
  }

  /** Latest known viewport, including any not-yet-flushed pending value. */
  function current(): Viewport {
    return pending ?? ctx.viewport.value;
  }

  function surfaceOffset(event: { clientX: number; clientY: number }): { x: number; y: number } {
    const rect = ctx.surfaceRect.value;
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  // ── wheel (zoom-at-pointer / scroll-pan / pinch) ──────────────────────────
  useEventListener(target, 'wheel', (event: WheelEvent) => {
    if (!enabled()) return;
    const o = opts.value;

    const pinch = event.ctrlKey;
    const wantZoom = pinch
      ? o.zoomOnPinch
      // Plain scroll zooms only when (a) configured, (b) not in pan-on-scroll
      // mode, and (c) the activation key (if any) is held.
      : o.zoomOnScroll && !o.panOnScroll && activationHeld(event, o.zoomActivationKey);

    if (wantZoom) {
      const vp = current();
      const factor = wheelToZoomFactor(event);
      const newZoom = clampZoom(vp.zoom * factor, ctx.minZoom.value, ctx.maxZoom.value);
      // Boundary: at min/max zoom the gesture is a no-op — DON'T preventDefault,
      // so an embedded surface lets the page scroll past the zoom limit.
      if (newZoom === vp.zoom) return;
      event.preventDefault();
      isZooming.value = true;
      schedule(zoomAtPointer(vp, newZoom, surfaceOffset(event)), vp);
      return;
    }

    if (o.panOnScroll) {
      const vp = current();
      const next = constrain({
        zoom: vp.zoom,
        x: vp.x - event.deltaX * o.panOnScrollSpeed,
        y: vp.y - event.deltaY * o.panOnScrollSpeed,
      }, vp);
      // Boundary: if the clamp/axis-lock left the viewport unchanged we consumed
      // nothing — let the page scroll instead of silently swallowing the wheel.
      if (next.x === vp.x && next.y === vp.y) return;
      event.preventDefault();
      isPanning.value = true;
      pending = next;
      if (rafId === null) rafId = requestAnimationFrame(flush);
    }
    // else: scroll not consumed → no preventDefault, page scrolls normally.
  }, { passive: false });

  // ── drag-pan (via usePointerDrag) ─────────────────────────────────────────
  let dragBase: Viewport = { x: 0, y: 0, zoom: 1 };
  const drag = usePointerDrag(target, {
    axis: toDragAxis(opts.value.axis),
    threshold: 0,
    buttons: [0, 1],
    disabled: () => !enabled() || !opts.value.panOnDrag,
    preventDefault: false,
    onStart: () => {
      dragBase = current();
      isPanning.value = true;
    },
    onMove: (state) => {
      // `state.total` already has the drag axis lock applied by usePointerDrag;
      // map the screen delta straight onto the viewport translate.
      schedule({
        zoom: dragBase.zoom,
        x: dragBase.x + state.total.x,
        y: dragBase.y + state.total.y,
      }, dragBase);
    },
    onEnd: () => {
      isPanning.value = false;
    },
  });

  // ── double-click zoom ─────────────────────────────────────────────────────
  useEventListener(target, 'dblclick', (event: MouseEvent) => {
    if (!enabled() || !opts.value.zoomOnDoubleClick) return;
    const vp = current();
    const newZoom = clampZoom(vp.zoom * opts.value.doubleClickZoomFactor, ctx.minZoom.value, ctx.maxZoom.value);
    if (newZoom === vp.zoom) return;
    event.preventDefault();
    isZooming.value = true;
    schedule(zoomAtPointer(vp, newZoom, surfaceOffset(event)), vp);
  });

  // ── keyboard pan/zoom ─────────────────────────────────────────────────────
  useEventListener(target, 'keydown', (event: KeyboardEvent) => {
    if (!enabled() || opts.value.disableKeyboard || isTyping()) return;
    const step = event.shiftKey ? opts.value.keyboardPanStep * 4 : opts.value.keyboardPanStep;

    // Escape cancels an in-flight drag-pan.
    if (event.key === 'Escape') {
      if (drag.isDragging.value) {
        drag.cancel();
        isPanning.value = false;
      }
      return;
    }

    const axis = opts.value.axis;
    const unit = ARROW_UNITS[event.key];
    if (unit) {
      const dx = unit[0] * step;
      const dy = unit[1] * step;
      // Respect axis lock: ignore the keypress entirely on the locked axis.
      if ((axis === 'y' && dx !== 0) || (axis === 'x' && dy !== 0)) return;
      event.preventDefault();
      const vp = current();
      schedule({ zoom: vp.zoom, x: vp.x + dx, y: vp.y + dy }, vp);
      return;
    }

    // Zoom: +/= in, - out, 0 actual size (zoom 1), Home reset.
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      isZooming.value = true;
      ctx.api.zoomIn();
      return;
    }
    if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      isZooming.value = true;
      ctx.api.zoomOut();
      return;
    }
    if (event.key === '0') {
      event.preventDefault();
      isZooming.value = true;
      ctx.api.zoomTo(1);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      ctx.api.reset();
    }
  });

  onScopeDispose(() => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    // usePointerDrag releases its own capture on scope dispose; cancel any
    // in-flight gesture too so a release happens even mid-drag.
    drag.cancel();
  });

  return { isPanning, isZooming };
}
