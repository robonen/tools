<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface AspectRatioProps extends PrimitiveProps {
  /**
   * Desired width-to-height ratio (e.g. `16 / 9`, `1`, `4 / 3`).
   * @default 1
   */
  ratio?: number;
}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { useForwardExpose } from '@robonen/vue';

useForwardExpose();

const { ratio = 1, as = 'div' } = defineProps<AspectRatioProps>();

const wrapperStyle = {
  position: 'relative' as const,
  width: '100%',
  paddingBottom: `${(1 / ratio) * 100}%`,
};

// Hoisted constant — the inner style never depends on props, so a single
// module-level object is reused across all instances.
const INNER_STYLE = {
  position: 'absolute' as const,
  inset: 0,
};
</script>

<template>
  <div :style="wrapperStyle" data-aspect-ratio-wrapper>
    <Primitive :as="as" :style="INNER_STYLE" :data-aspect-ratio="true">
      <slot />
    </Primitive>
  </div>
</template>
