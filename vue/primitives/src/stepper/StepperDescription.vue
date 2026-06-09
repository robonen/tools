<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * Optional supporting text for a step. Its `id` is wired to the trigger's
 * `aria-describedby` so it is announced as a description of the step.
 */
export interface StepperDescriptionProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { useForwardExpose } from '@robonen/vue';
import { useStepperItemContext } from './context';

const { as = 'p' } = defineProps<StepperDescriptionProps>();

const item = useStepperItemContext();
const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :id="item.descriptionId"
  >
    <slot />
  </Primitive>
</template>
