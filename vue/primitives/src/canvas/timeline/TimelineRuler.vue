<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The time axis sitting above the tracks. It embeds a {@link TimeRulerRoot} bound
 * to the SAME `offset` / `pxPerSecond` / `fps` as the timeline (so the ruler and
 * the lanes share one scale), and turns clicks / drags on the axis into playhead
 * scrubs. The default slot forwards `{ ticks, majorTicks, minorTicks, scale,
 * formatTime }` from the embedded ruler so consumers render their own tick layer.
 */
export interface TimelineRulerProps extends PrimitiveProps {
  /** Tick label rendering mode. @default 'timecode' */
  mode?: 'seconds' | 'timecode' | 'frames';
  /** Target pixel spacing between ticks. @default 80 */
  targetDensity?: number;
}
</script>

<script setup lang="ts">
import { useEventListener } from '@robonen/vue';
import { shallowRef } from 'vue';
import { Primitive } from '../../internal/primitive';
import { TimeRulerRoot } from '../time-ruler';
import { usePointerDrag } from '../../internal/pointer-drag';
import { useTimelineContext } from './context';

const {
  mode = 'timecode',
  targetDensity = 80,
  as = 'div',
} = defineProps<TimelineRulerProps>();

const ctx = useTimelineContext();
const rulerEl = shallowRef<HTMLElement | null>(null);

/** Client-x → time (seconds), via the ruler element's rect + the shared invert. */
function timeFromClientX(clientX: number): number {
  const el = rulerEl.value;
  if (!el) return ctx.currentTime.value;
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0) return ctx.currentTime.value;
  const localX = ctx.direction.value === 'rtl' ? rect.right - clientX : clientX - rect.left;
  return ctx.invert(localX);
}

// Click + drag on the axis scrubs the playhead (snapped to the frame grid).
usePointerDrag(() => (ctx.disabled.value ? null : rulerEl.value), {
  axis: 'x',
  threshold: 0,
  disabled: () => ctx.disabled.value,
  onStart: (state) => {
    ctx.setCurrentTime(ctx.snapToFrame(timeFromClientX(state.point.x)), true);
  },
  onMove: (state) => {
    ctx.setCurrentTime(ctx.snapToFrame(timeFromClientX(state.point.x)), true);
  },
  onEnd: () => {
    ctx.commitScrub();
  },
});

// A bare click without crossing threshold still scrubs.
useEventListener(rulerEl, 'pointerdown', (event: PointerEvent) => {
  if (ctx.disabled.value || event.button !== 0) return;
  ctx.setCurrentTime(ctx.snapToFrame(timeFromClientX(event.clientX)), true);
});

function setRulerRef(node: unknown): void {
  rulerEl.value = (node && typeof node === 'object' && '$el' in node ? (node as { $el: HTMLElement }).$el : node) as HTMLElement | null;
}
</script>

<template>
  <Primitive
    :as="as"
    data-orientation="horizontal"
  >
    <TimeRulerRoot
      :ref="setRulerRef"
      v-model:offset="ctx.offset.value"
      v-model:zoom="ctx.pxPerSecond.value"
      :duration="ctx.duration.value"
      :fps="ctx.fps.value"
      :mode="mode"
      :target-density="targetDensity"
      :disabled="ctx.disabled.value"
      :dir="ctx.direction.value"
    >
      <template #default="slotProps">
        <slot v-bind="slotProps" />
      </template>
    </TimeRulerRoot>
  </Primitive>
</template>
