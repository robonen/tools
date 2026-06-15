<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The canonical playhead scrubber. `role="slider"` over `[0, duration]` with
 * `aria-valuenow` = `currentTime`, an `aria-valuetext` timecode, horizontal
 * orientation, and the default `aria-label` `'Playhead'`. Positioned at
 * `scale(currentTime)`. Drag scrubs (snapped to the frame grid); Arrow keys step
 * one frame (Shift = 1 s), Home / End jump to 0 / duration.
 *
 * It is the Root's single keyboard scrub stop — `tabindex` 0 when interactive.
 */
export interface TimelinePlayheadProps extends PrimitiveProps {
  /** Accessible label. @default 'Playhead' */
  label?: string;
}
</script>

<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import { Primitive } from '../../internal/primitive';
import { usePointerDrag } from '../../internal/pointer-drag';
import { getDirectionAwareKey } from '../../utilities/roving-focus/utils';
import { useTimelineContext } from './context';

const { label = 'Playhead', as = 'div' } = defineProps<TimelinePlayheadProps>();

const ctx = useTimelineContext();
const el = shallowRef<HTMLElement | null>(null);

const left = computed(() => ctx.scale(ctx.currentTime.value));
const valueText = computed(() => ctx.formatTimecode(ctx.currentTime.value));
const durationMax = computed(() => ctx.duration.value || Number.MAX_SAFE_INTEGER);

let startTime = 0;

usePointerDrag(() => (ctx.disabled.value ? null : el.value), {
  axis: 'x',
  disabled: () => ctx.disabled.value,
  stopPropagation: true,
  onStart: () => {
    startTime = ctx.currentTime.value;
    return undefined;
  },
  onMove: (state) => {
    const dirSign = ctx.direction.value === 'rtl' ? -1 : 1;
    const deltaSeconds = (state.total.x / ctx.pxPerSecond.value) * dirSign;
    ctx.setCurrentTime(ctx.snapToFrame(startTime + deltaSeconds), true);
  },
  onEnd: () => {
    ctx.commitScrub();
  },
});

function step(seconds: number): void {
  ctx.setCurrentTime(ctx.snapToFrame(ctx.currentTime.value + seconds), false);
  ctx.commitScrub();
}

function onKeydown(event: KeyboardEvent): void {
  if (ctx.disabled.value) return;
  const key = getDirectionAwareKey(event.key, ctx.direction.value);
  const frame = ctx.fps.value > 0 ? 1 / ctx.fps.value : 1;
  switch (key) {
    case 'ArrowLeft':
      event.preventDefault();
      step(event.shiftKey ? -1 : -frame);
      break;
    case 'ArrowRight':
      event.preventDefault();
      step(event.shiftKey ? 1 : frame);
      break;
    case 'Home':
      event.preventDefault();
      ctx.setCurrentTime(0, false);
      ctx.commitScrub();
      break;
    case 'End':
      event.preventDefault();
      ctx.setCurrentTime(ctx.duration.value, false);
      ctx.commitScrub();
      break;
    default:
      break;
  }
}

function setRef(node: unknown): void {
  el.value = (node && typeof node === 'object' && '$el' in node ? (node as { $el: HTMLElement }).$el : node) as HTMLElement | null;
}
</script>

<template>
  <Primitive
    :ref="setRef"
    :as="as"
    role="slider"
    aria-orientation="horizontal"
    :aria-label="label"
    :aria-valuemin="0"
    :aria-valuemax="durationMax"
    :aria-valuenow="ctx.currentTime.value"
    :aria-valuetext="valueText"
    :aria-disabled="ctx.disabled.value || undefined"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :tabindex="ctx.disabled.value ? undefined : 0"
    :style="{
      position: 'absolute',
      left: `${left}px`,
      top: '0',
    }"
    @keydown="onKeydown"
  >
    <slot :current-time="ctx.currentTime.value" />
  </Primitive>
</template>
