<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The transient marquee shown while a new region is being dragged out
 * (`createRegionOnDrag`). Renders nothing until a create gesture is in flight,
 * then positions/sizes itself from the in-progress selection. The pixel
 * geometry is also exposed via the default slot so a consumer can render their
 * own preview surface. `aria-hidden` (it has no committed value yet).
 */
export interface WaveformSelectionPreviewProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { useWaveformContext } from './context';

const { as = 'div' } = defineProps<WaveformSelectionPreviewProps>();
const ctx = useWaveformContext();
const { forwardRef } = useForwardExpose();

const active = computed(() => ctx.preview.value.active);

const geometry = computed(() => {
  const { start, end } = ctx.preview.value;
  const a = ctx.projection.scale(start);
  const b = ctx.projection.scale(end);
  const left = Math.min(a, b);
  const width = Math.abs(b - a);
  return { left, width, start: Math.min(start, end), end: Math.max(start, end) };
});

const positionStyle = computed<{ left: string | undefined; right: string | undefined; width: string }>(() => {
  const g = geometry.value;
  const w = `${g.width}px`;
  if (ctx.direction.value === 'rtl') return { left: undefined, right: `${g.left}px`, width: w };
  return { left: `${g.left}px`, right: undefined, width: w };
});
</script>

<template>
  <Primitive
    v-if="active"
    :ref="forwardRef"
    :as="as"
    aria-hidden="true"
    data-waveform-selection-preview=""
    :style="{ position: 'absolute', top: '0', bottom: '0', ...positionStyle }"
  >
    <slot
      :left="geometry.left"
      :width="geometry.width"
      :start="geometry.start"
      :end="geometry.end"
    />
  </Primitive>
</template>
