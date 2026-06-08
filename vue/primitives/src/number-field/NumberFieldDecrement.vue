<script lang="ts">
import type { PrimitiveProps } from '../primitive';
export interface NumberFieldDecrementProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { useForwardExpose } from '@robonen/vue';
import { useNumberFieldContext } from './context';

const { as = 'button' } = defineProps<NumberFieldDecrementProps>();
const { forwardRef } = useForwardExpose();
const ctx = useNumberFieldContext();

function onClick() {
  ctx.decrement();
}
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :type="as === 'button' ? 'button' : undefined"
    tabindex="-1"
    aria-hidden="true"
    :disabled="ctx.disabled.value || ctx.readonly.value || undefined"
    :data-disabled="(ctx.disabled.value || ctx.readonly.value) ? '' : undefined"
    @click="onClick"
  >
    <slot />
  </Primitive>
</template>
