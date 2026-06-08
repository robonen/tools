<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface StepperIndicatorProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { useForwardExpose } from '@robonen/vue';
import { useStepperItemContext } from './context';

const { as = 'div' } = defineProps<StepperIndicatorProps>();

const item = useStepperItemContext();
const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :data-state="item.state.value"
  >
    <slot :step="item.step.value" :state="item.state.value">
      {{ item.step.value }}
    </slot>
  </Primitive>
</template>
