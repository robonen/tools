<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The rule-of-thirds overlay: two vertical and two horizontal guide lines drawn
 * across the crop box at the ⅓ and ⅔ marks. Purely presentational
 * (`aria-hidden`), it renders only when the Root's `grid` prop is enabled and a
 * selection exists. Place it inside `CropArea`. Each line is exposed as a slot
 * entry so the consumer can style or replace the lines; the default slot renders
 * four absolutely-positioned `<span>`s.
 */
export interface CropGridProps extends PrimitiveProps {
  /** Number of columns/rows the grid divides the box into. @default 3 */
  divisions?: number;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { Primitive } from '../../internal/primitive';
import { useForwardExpose } from '@robonen/vue';
import { useCropContext } from './context';

const { divisions = 3, as = 'div' } = defineProps<CropGridProps>();

const ctx = useCropContext();
const { forwardRef } = useForwardExpose();

const visible = computed(() => ctx.grid.value && ctx.rect.value !== null);

// Interior line positions as percentages of the box (e.g. 33.33%, 66.66% for
// thirds). Endpoints (0/100) are the box edges and are omitted.
const lines = computed(() => {
  const out: number[] = [];
  const n = Math.max(2, Math.round(divisions));
  for (let i = 1; i < n; i++) out.push((i / n) * 100);
  return out;
});
</script>

<template>
  <Primitive
    v-if="visible"
    :ref="forwardRef"
    :as="as"
    aria-hidden="true"
    data-crop-grid=""
    :style="{ position: 'absolute', inset: '0', pointerEvents: 'none' }"
  >
    <slot :lines="lines">
      <Primitive
        v-for="(pct, i) in lines"
        :key="`v-${i}`"
        as="span"
        data-orientation="vertical"
        :style="{ position: 'absolute', top: '0', bottom: '0', left: `${pct}%`, width: '0' }"
      />
      <Primitive
        v-for="(pct, i) in lines"
        :key="`h-${i}`"
        as="span"
        data-orientation="horizontal"
        :style="{ position: 'absolute', left: '0', right: '0', top: `${pct}%`, height: '0' }"
      />
    </slot>
  </Primitive>
</template>
