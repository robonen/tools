<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * The visual fill of the progress bar, rendered inside `ProgressRoot`. It reads
 * the value, max, and state from context and exposes them via `data-state`,
 * `data-value`, and `data-max` (plus matching slot props) so you can size and
 * style the fill — e.g. translating it by the completion percentage.
 */
export interface ProgressIndicatorProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { useForwardExpose } from '@robonen/vue';
import { useProgressContext } from './context';

const { as = 'div' } = defineProps<ProgressIndicatorProps>();

const { forwardRef } = useForwardExpose();

const ctx = useProgressContext();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :data-state="ctx.state.value"
    :data-value="ctx.value.value ?? undefined"
    :data-max="ctx.max.value"
  >
    <slot :value="ctx.value.value" :max="ctx.max.value" :state="ctx.state.value" />
  </Primitive>
</template>
