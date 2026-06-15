<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The track gutter: the label plus mute / lock / solo toggle buttons and a
 * drag-resize affordance for the lane height. The default slot exposes the track
 * record and ready-made `toggle*` handlers + flag booleans so a consumer can
 * render its own buttons; the `#resize-handle` slot wires the height drag.
 *
 * `role="rowheader"`; `data-muted` / `data-locked` / `data-soloed` mirror the
 * lane. The toggle buttons are native `<button>`s with `aria-pressed`.
 */
export interface TimelineTrackHeaderProps extends PrimitiveProps {
  /** Minimum lane height (px) the resize drag clamps to. @default 24 */
  minHeight?: number;
  /** Maximum lane height (px) the resize drag clamps to. @default 320 */
  maxHeight?: number;
}
</script>

<script setup lang="ts">
import { shallowRef } from 'vue';
import { clamp } from '@robonen/stdlib';
import { Primitive } from '../../internal/primitive';
import { usePointerDrag } from '../../internal/pointer-drag';
import { useTimelineContext, useTimelineTrackContext } from './context';

const {
  minHeight = 24,
  maxHeight = 320,
  as = 'div',
} = defineProps<TimelineTrackHeaderProps>();

const ctx = useTimelineContext();
const trackCtx = useTimelineTrackContext();

const resizeHandle = shallowRef<HTMLElement | null>(null);
let startHeight = 0;

usePointerDrag(() => (ctx.disabled.value ? null : resizeHandle.value), {
  axis: 'y',
  disabled: () => ctx.disabled.value,
  onStart: () => {
    startHeight = trackCtx.height.value;
  },
  onMove: (state) => {
    const next = clamp(startHeight + state.total.y, minHeight, maxHeight);
    trackCtx.patchTrack({ height: Math.round(next) });
  },
});

function setResizeRef(node: unknown): void {
  resizeHandle.value = (node && typeof node === 'object' && '$el' in node ? (node as { $el: HTMLElement }).$el : node) as HTMLElement | null;
}
</script>

<template>
  <Primitive
    :as="as"
    role="rowheader"
    :data-track-id="trackCtx.trackId"
    :data-muted="trackCtx.track.value?.muted ? '' : undefined"
    :data-locked="trackCtx.track.value?.locked ? '' : undefined"
    :data-soloed="trackCtx.track.value?.soloed ? '' : undefined"
  >
    <slot
      :track="trackCtx.track.value"
      :label="trackCtx.track.value?.label"
      :muted="!!trackCtx.track.value?.muted"
      :locked="!!trackCtx.track.value?.locked"
      :soloed="!!trackCtx.track.value?.soloed"
      :toggle-mute="() => trackCtx.toggleFlag('muted')"
      :toggle-lock="() => trackCtx.toggleFlag('locked')"
      :toggle-solo="() => trackCtx.toggleFlag('soloed')"
      :set-resize-ref="setResizeRef"
    >
      <span>{{ trackCtx.track.value?.label }}</span>
      <button
        type="button"
        :aria-pressed="!!trackCtx.track.value?.muted"
        :aria-label="`Mute ${trackCtx.track.value?.label ?? trackCtx.trackId}`"
        :disabled="ctx.disabled.value"
        @click="trackCtx.toggleFlag('muted')"
      >M</button>
      <button
        type="button"
        :aria-pressed="!!trackCtx.track.value?.soloed"
        :aria-label="`Solo ${trackCtx.track.value?.label ?? trackCtx.trackId}`"
        :disabled="ctx.disabled.value"
        @click="trackCtx.toggleFlag('soloed')"
      >S</button>
      <button
        type="button"
        :aria-pressed="!!trackCtx.track.value?.locked"
        :aria-label="`Lock ${trackCtx.track.value?.label ?? trackCtx.trackId}`"
        :disabled="ctx.disabled.value"
        @click="trackCtx.toggleFlag('locked')"
      >L</button>
      <span
        :ref="setResizeRef"
        role="separator"
        aria-orientation="horizontal"
        aria-hidden="true"
      />
    </slot>
  </Primitive>
</template>
