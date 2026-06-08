<script lang="ts">
import type { PrimitiveProps } from '../primitive';
export interface CheckboxIndicatorProps extends PrimitiveProps {
  /** Keep mounted even when unchecked (for CSS exit animations). */
  forceMount?: boolean;

}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { useCheckboxContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const { as = 'span', forceMount = false } = defineProps<CheckboxIndicatorProps>();
const ctx = useCheckboxContext();

const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    v-if="forceMount || ctx.checked.value !== false"
    :data-state="ctx.checked.value === 'indeterminate' ? 'indeterminate' : (ctx.checked.value ? 'checked' : 'unchecked')"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    style="pointer-events: none;"
  >
    <slot :checked="ctx.checked.value" />
  </Primitive>
</template>
