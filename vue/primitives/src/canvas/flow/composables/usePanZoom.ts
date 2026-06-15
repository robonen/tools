import type { Ref } from 'vue';
import { onScopeDispose, shallowRef } from 'vue';
import { useEventListener } from '@robonen/vue';
import type { FlowContext } from '../context';
import type { Viewport } from '../types';
import { clampZoom, wheelToZoomFactor, zoomAtPointer } from '../utils';
import { capturePointer, releasePointer } from './dom';

export interface PanZoomOptions {
  /** Wheel scroll zooms toward the pointer. @default true */
  zoomOnScroll?: boolean;
  /** Trackpad pinch (ctrl+wheel) zooms. @default true */
  zoomOnPinch?: boolean;
  /** Wheel scroll pans instead of zooms (pinch still zooms). @default false */
  panOnScroll?: boolean;
  /** Scroll-pan speed multiplier. @default 0.5 */
  panOnScrollSpeed?: number;
  /** Drag the empty pane to pan. @default true */
  panOnDrag?: boolean;
  /** Double-click zooms in toward the pointer. @default true */
  zoomOnDoubleClick?: boolean;
  /** Factor applied per double-click. @default 1.2 */
  doubleClickZoomFactor?: number;
}

/** True if the event target opts out of panning via a `.nopan` ancestor. */
function isPanBlocked(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest('.nopan');
}

/**
 * Wires wheel zoom-at-pointer, optional scroll-pan, and drag-pan onto the pane
 * element, writing the master `viewport` through one RAF-batched flush per frame
 * so a burst of wheel/pointer events never causes more than one layout write.
 *
 * Node drag stops propagation on its own pointerdown, so any pointerdown that
 * reaches the pane is a pan (or, later, a marquee — gated by the caller).
 */
export function usePanZoom(
  target: Ref<HTMLElement | undefined>,
  ctx: FlowContext,
  options: PanZoomOptions = {},
): { isPanning: Readonly<Ref<boolean>>; panningRef: Ref<boolean> } {
  const {
    zoomOnScroll = true,
    zoomOnPinch = true,
    panOnScroll = false,
    panOnScrollSpeed = 0.5,
    panOnDrag = true,
    zoomOnDoubleClick = true,
    doubleClickZoomFactor = 1.2,
  } = options;

  // ── RAF-batched viewport writes ──────────────────────────────────────────
  let rafId: number | null = null;
  let pending: Viewport | null = null;

  function flush() {
    rafId = null;
    if (pending) {
      ctx.viewport.value = pending;
      pending = null;
    }
  }

  function schedule(next: Viewport) {
    pending = next;
    if (rafId === null) rafId = requestAnimationFrame(flush);
  }

  /** Latest known viewport, including any not-yet-flushed pending value. */
  function current(): Viewport {
    return pending ?? ctx.viewport.value;
  }

  onScopeDispose(() => {
    if (rafId !== null) cancelAnimationFrame(rafId);
  });

  function paneOffset(event: { clientX: number; clientY: number }) {
    const rect = ctx.paneRect.value;
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  // ── wheel ────────────────────────────────────────────────────────────────
  useEventListener(target, 'wheel', (event: WheelEvent) => {
    if (!ctx.interactive.value) return;
    if (event.target instanceof Element && event.target.closest('.nowheel')) return;

    const pinch = event.ctrlKey;
    const shouldZoom = pinch ? zoomOnPinch : zoomOnScroll && !panOnScroll;

    event.preventDefault();

    if (shouldZoom) {
      const vp = current();
      const factor = wheelToZoomFactor(event);
      const newZoom = clampZoom(vp.zoom * factor, ctx.minZoom.value, ctx.maxZoom.value);
      if (newZoom === vp.zoom) return;
      schedule(zoomAtPointer(vp, paneOffset(event), newZoom));
      return;
    }

    // Scroll-pan.
    const vp = current();
    schedule({
      zoom: vp.zoom,
      x: vp.x - event.deltaX * panOnScrollSpeed,
      y: vp.y - event.deltaY * panOnScrollSpeed,
    });
  }, { passive: false });

  // ── drag-pan ───────────────────────────────────────────────────────────────
  const panningRef = shallowRef(false);
  let startX = 0;
  let startY = 0;
  let baseX = 0;
  let baseY = 0;
  let pointerId = -1;

  useEventListener(target, 'pointerdown', (event: PointerEvent) => {
    if (!panOnDrag || !ctx.interactive.value) return;
    if (event.button !== 0 && event.button !== 1) return;
    // Shift + drag is reserved for marquee selection.
    if (event.button === 0 && event.shiftKey) return;
    if (isPanBlocked(event.target)) return;

    const vp = current();
    startX = event.clientX;
    startY = event.clientY;
    baseX = vp.x;
    baseY = vp.y;
    pointerId = event.pointerId;
    panningRef.value = true;
    capturePointer(target.value, event.pointerId);
  });

  useEventListener(target, 'pointermove', (event: PointerEvent) => {
    if (!panningRef.value || event.pointerId !== pointerId) return;
    const vp = current();
    schedule({
      zoom: vp.zoom,
      x: baseX + (event.clientX - startX),
      y: baseY + (event.clientY - startY),
    });
  });

  function endPan(event: PointerEvent) {
    if (!panningRef.value || event.pointerId !== pointerId) return;
    panningRef.value = false;
    pointerId = -1;
    releasePointer(target.value, event.pointerId);
  }

  useEventListener(target, 'pointerup', endPan);
  useEventListener(target, 'pointercancel', endPan);

  // ── double-click zoom ──────────────────────────────────────────────────────
  useEventListener(target, 'dblclick', (event: MouseEvent) => {
    if (!zoomOnDoubleClick || !ctx.interactive.value) return;
    if (event.target instanceof Element && event.target.closest('.nopan')) return;
    const vp = current();
    const newZoom = clampZoom(vp.zoom * doubleClickZoomFactor, ctx.minZoom.value, ctx.maxZoom.value);
    if (newZoom === vp.zoom) return;
    schedule(zoomAtPointer(vp, paneOffset(event), newZoom));
  });

  return { isPanning: panningRef, panningRef };
}
