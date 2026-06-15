<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The background gridlines of a `CurveEditorRoot`, drawn from `niceTicks` on
 * both axes. Rendered as an SVG `<g>` by default (override via `as`) and marked
 * `aria-hidden` — it is decorative. Exposes the projected `xTicks` / `yTicks` as
 * slot props so the consumer draws their own lines / labels, and provides a
 * `#histogram` slot region behind the curve for tone-curve histograms.
 */
export interface CurveEditorGridProps extends PrimitiveProps {
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { Primitive } from '../../internal/primitive';
import { useCurveEditorContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const { as = 'g' } = defineProps<CurveEditorGridProps>();
const ctx = useCurveEditorContext();

// `useScale` already projects ticks to pixels (`tick.px`); the x ticks run along
// the horizontal axis, the y ticks along the vertical (value-up) axis.
const xTicks = computed(() => ctx.scaleX.ticks.value);
const yTicks = computed(() => ctx.scaleY.ticks.value);

const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    aria-hidden="true"
    data-curve-editor-grid=""
  >
    <slot :x-ticks="xTicks" :y-ticks="yTicks" />
    <slot name="histogram" :x-ticks="xTicks" :y-ticks="yTicks" />
  </Primitive>
</template>
