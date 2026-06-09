<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * The visual marker for a step — typically a numbered circle or check. Defaults
 * to rendering the step number, and exposes the current `step` and `state` via
 * slot props so you can swap in icons (e.g. a check when completed).
 */
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
