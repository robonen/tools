<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * Displays content within a fixed, responsive width-to-height ratio. The
 * element grows to fill its container's width and derives its height from the
 * `ratio`, so the box keeps its proportions at any size. Use it to reserve
 * layout space for images, video, maps, or embeds and avoid content shift.
 */
export interface AspectRatioProps extends PrimitiveProps {
  /**
   * Desired width-to-height ratio (e.g. `16 / 9`, `1`, `4 / 3`).
   * @default 1
   */
  ratio?: number;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { Primitive } from '../primitive';
import { useForwardExpose } from '@robonen/vue';

const { forwardRef } = useForwardExpose();

const { ratio = 1, as = 'div' } = defineProps<AspectRatioProps>();

const wrapperStyle = computed(() => ({
  position: 'relative' as const,
  width: '100%',
  paddingBottom: `${(1 / ratio) * 100}%`,
}));

// Hoisted constant — the inner style never depends on props, so a single
// module-level object is reused across all instances.
const INNER_STYLE = {
  position: 'absolute' as const,
  inset: 0,
};
</script>

<template>
  <div :ref="forwardRef" :style="wrapperStyle" data-aspect-ratio-wrapper>
    <Primitive :as="as" :style="INNER_STYLE" :data-aspect-ratio="true">
      <slot />
    </Primitive>
  </div>
</template>
