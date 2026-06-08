<script lang="ts">
import type { PrimitiveProps } from '../primitive';

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
