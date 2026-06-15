<script lang="ts">
export type FlowBackgroundVariant = 'dots' | 'lines' | 'cross';

/**
 * A grid background drawn as an SVG `<pattern>` that pans and zooms with the
 * viewport (the pattern origin shifts by `viewport % (gap·zoom)` and its cell
 * scales by `zoom`). Sits behind the viewport layer, ignores pointer events, and
 * is fully styleable via `[data-flow-background]` / `currentColor`.
 */
export interface FlowBackgroundProps {
  /** Pattern style. @default 'dots' */
  variant?: FlowBackgroundVariant;
  /** Grid spacing in flow units (single value or `[x, y]`). @default 20 */
  gap?: number | [number, number];
  /** Dot radius / line thickness in px. @default 1 */
  size?: number;
  /** Pattern colour. @default 'currentColor' */
  color?: string;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { useFlowContext } from './context';

const { variant = 'dots', gap = 20, size = 1, color = 'currentColor' } = defineProps<FlowBackgroundProps>();

const ctx = useFlowContext();
const patternId = computed(() => `${ctx.flowId}__bg`);

const gapXY = computed<[number, number]>(() => (Array.isArray(gap) ? gap : [gap, gap]));

const scaled = computed(() => {
  const vp = ctx.viewport.value;
  return {
    w: gapXY.value[0] * vp.zoom,
    h: gapXY.value[1] * vp.zoom,
    x: vp.x % (gapXY.value[0] * vp.zoom),
    y: vp.y % (gapXY.value[1] * vp.zoom),
    s: size * vp.zoom,
  };
});

// Path for line / cross variants, drawn at the cell origin.
const linePath = computed(() => {
  const { w, h } = scaled.value;
  return variant === 'cross'
    ? `M ${w / 2} ${h / 2 - 3} V ${h / 2 + 3} M ${w / 2 - 3} ${h / 2} H ${w / 2 + 3}`
    : `M ${w} 0 H 0 V ${h}`;
});
</script>

<template>
  <svg
    data-flow-background=""
    :data-variant="variant"
    :style="{ position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', color }"
  >
    <pattern
      :id="patternId"
      :x="scaled.x"
      :y="scaled.y"
      :width="scaled.w"
      :height="scaled.h"
      patternUnits="userSpaceOnUse"
    >
      <circle
        v-if="variant === 'dots'"
        :cx="scaled.w / 2"
        :cy="scaled.h / 2"
        :r="scaled.s"
        fill="currentColor"
      />
      <path
        v-else
        :d="linePath"
        fill="none"
        stroke="currentColor"
        :stroke-width="scaled.s"
      />
    </pattern>
    <rect
      x="0"
      y="0"
      width="100%"
      height="100%"
      :fill="`url(#${patternId})`"
    />
  </svg>
</template>
