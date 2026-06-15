import type { Ref } from 'vue';
import { shallowRef } from 'vue';
import { useEventListener } from '@robonen/vue';
import type { FlowContext } from '../context';
import { getNodesInsideRect } from '../utils';
import { capturePointer, releasePointer } from './dom';

/** A marquee rectangle in pane-relative pixels, for rendering the overlay. */
export interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Shift + drag on the empty pane draws a selection rectangle and selects the
 * nodes it covers on release (`selectionMode` decides partial vs full). Pan is
 * suppressed while Shift is held (see `usePanZoom`), so the two never fight.
 * Returns the live rect for `FlowPane` to render.
 */
export function useMarquee(
  target: Ref<HTMLElement | undefined>,
  ctx: FlowContext,
): { active: Readonly<Ref<boolean>>; rect: Readonly<Ref<MarqueeRect | null>> } {
  const active = shallowRef(false);
  const rect = shallowRef<MarqueeRect | null>(null);

  let pointerId = -1;
  let startClientX = 0;
  let startClientY = 0;

  function paneRelative(clientX: number, clientY: number): { x: number; y: number } {
    const pane = ctx.paneRect.value;
    return { x: clientX - pane.left, y: clientY - pane.top };
  }

  useEventListener(target, 'pointerdown', (event: PointerEvent) => {
    if (event.button !== 0 || !event.shiftKey) return;
    if (!ctx.interactive.value || !ctx.elementsSelectable.value) return;
    pointerId = event.pointerId;
    startClientX = event.clientX;
    startClientY = event.clientY;
    active.value = true;
    rect.value = { ...paneRelative(event.clientX, event.clientY), width: 0, height: 0 };
    capturePointer(target.value, event.pointerId);
  });

  useEventListener(target, 'pointermove', (event: PointerEvent) => {
    if (!active.value || event.pointerId !== pointerId) return;
    const start = paneRelative(startClientX, startClientY);
    const cur = paneRelative(event.clientX, event.clientY);
    rect.value = {
      x: Math.min(start.x, cur.x),
      y: Math.min(start.y, cur.y),
      width: Math.abs(cur.x - start.x),
      height: Math.abs(cur.y - start.y),
    };
  });

  function end(event: PointerEvent): void {
    if (!active.value || event.pointerId !== pointerId) return;
    const a = ctx.screenToFlow({ x: startClientX, y: startClientY });
    const b = ctx.screenToFlow({ x: event.clientX, y: event.clientY });
    const flowRect = {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      width: Math.abs(b.x - a.x),
      height: Math.abs(b.y - a.y),
    };
    const ids = getNodesInsideRect(ctx.nodeLookup.value.values(), flowRect, ctx.selectionMode.value);
    ctx.setSelection(ids, []);

    active.value = false;
    rect.value = null;
    pointerId = -1;
    releasePointer(target.value, event.pointerId);
  }

  useEventListener(target, 'pointerup', end);
  useEventListener(target, 'pointercancel', end);

  return { active, rect };
}
