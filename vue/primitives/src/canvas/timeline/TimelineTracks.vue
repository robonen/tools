<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The scrollable lanes container: a vertical stack of `TimelineTrack`s and the
 * surface that hosts the marquee selection layer. It registers itself as the
 * timeline's `viewportEl` (the scale's range origin) and measures its width so
 * the shared `useScale` projects correctly.
 *
 * Shift + drag on empty space (or plain drag, configurable) draws a selection
 * rectangle and selects every clip whose time span intersects it on release —
 * ported from the flow `useMarquee` pattern but operating in the timeline's
 * 1-D-time × track-lane space.
 */
export interface TimelineTracksProps extends PrimitiveProps {
  /**
   * Whether marquee selection requires holding Shift.
   * - `true` (default): plain drag on empty space draws a marquee.
   * - `false`: only Shift+drag draws a marquee.
   * @default true
   */
  marquee?: boolean;
  /** Require Shift to start a marquee. @default false */
  requireShift?: boolean;
}
</script>

<script setup lang="ts">
import { shallowRef } from 'vue';
import { useEventListener } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { useTimelineContext } from './context';
import { clipIntersectsTime } from './utils';

const {
  marquee = true,
  requireShift = false,
  as = 'div',
} = defineProps<TimelineTracksProps>();

const ctx = useTimelineContext();
const el = shallowRef<HTMLElement | null>(null);

let pointerId = -1;
let startClientX = 0;
let startClientY = 0;
let startTime = 0;

function viewportRelative(clientX: number, clientY: number): { x: number; y: number } {
  const rect = el.value?.getBoundingClientRect();
  if (!rect) return { x: 0, y: 0 };
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function localXToTime(clientX: number): number {
  const rect = el.value?.getBoundingClientRect();
  if (!rect || rect.width <= 0) return 0;
  const localX = ctx.direction.value === 'rtl' ? rect.right - clientX : clientX - rect.left;
  return ctx.invert(localX);
}

useEventListener(el, 'pointerdown', (event: PointerEvent) => {
  if (ctx.disabled.value || !marquee || event.button !== 0) return;
  if (requireShift && !event.shiftKey) return;
  // Only start a marquee on the viewport background itself — clips stop
  // propagation, so a press that reaches here is on empty space.
  if (event.target !== el.value) return;
  pointerId = event.pointerId;
  startClientX = event.clientX;
  startClientY = event.clientY;
  startTime = localXToTime(event.clientX);
  ctx.marquee.value = { ...viewportRelative(event.clientX, event.clientY), width: 0, height: 0 };
  el.value?.setPointerCapture?.(event.pointerId);
});

useEventListener(el, 'pointermove', (event: PointerEvent) => {
  if (ctx.marquee.value === null || event.pointerId !== pointerId) return;
  const start = viewportRelative(startClientX, startClientY);
  const cur = viewportRelative(event.clientX, event.clientY);
  ctx.marquee.value = {
    x: Math.min(start.x, cur.x),
    y: Math.min(start.y, cur.y),
    width: Math.abs(cur.x - start.x),
    height: Math.abs(cur.y - start.y),
  };
});

function endMarquee(event: PointerEvent): void {
  if (ctx.marquee.value === null || event.pointerId !== pointerId) return;
  const endTime = localXToTime(event.clientX);
  const ids: string[] = [];
  for (const clip of ctx.clipLookup.value.values()) {
    if (clipIntersectsTime(clip, startTime, endTime)) ids.push(clip.id);
  }
  ctx.setSelection(ids);
  ctx.marquee.value = null;
  pointerId = -1;
  el.value?.releasePointerCapture?.(event.pointerId);
}

useEventListener(el, 'pointerup', endMarquee);
useEventListener(el, 'pointercancel', endMarquee);

function setRef(node: unknown): void {
  el.value = (node && typeof node === 'object' && '$el' in node ? (node as { $el: HTMLElement }).$el : node) as HTMLElement | null;
  ctx.viewportEl.value = el.value;
}
</script>

<template>
  <Primitive
    :ref="setRef"
    :as="as"
    role="grid"
    data-orientation="horizontal"
    :data-disabled="ctx.disabled.value ? '' : undefined"
  >
    <slot :marquee="ctx.marquee.value" />
  </Primitive>
</template>
