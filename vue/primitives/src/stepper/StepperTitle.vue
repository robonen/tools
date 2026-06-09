<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * The accessible label for a step. Its `id` is wired to the trigger's
 * `aria-labelledby`, so screen readers announce it when the trigger is focused.
 */
export interface StepperTitleProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { useForwardExpose } from '@robonen/vue';
import { useStepperItemContext } from './context';

const { as = 'h4' } = defineProps<StepperTitleProps>();

const item = useStepperItemContext();
const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :id="item.titleId"
  >
    <slot />
  </Primitive>
</template>
