<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The base ("before") layer of the comparison — the full, unclipped content
 * that sits underneath. Rendered inside `CompareSliderRoot` and absolutely
 * positioned to fill it (`inset: 0`). Put the original image / view here; the
 * `CompareSliderAfter` layer is drawn on top and clipped to reveal it.
 */
export interface CompareSliderBeforeProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../../internal/primitive';
import { useForwardExpose } from '@robonen/vue';
import { useCompareSliderContext } from './context';

const { as = 'div' } = defineProps<CompareSliderBeforeProps>();
const ctx = useCompareSliderContext();
const { forwardRef } = useForwardExpose();

// Stable shape: same keys in the same order for a monomorphic style object.
const style = {
  position: 'absolute',
  top: '0',
  right: '0',
  bottom: '0',
  left: '0',
} as const;
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :style="style"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :data-orientation="ctx.orientation.value"
  >
    <slot />
  </Primitive>
</template>
