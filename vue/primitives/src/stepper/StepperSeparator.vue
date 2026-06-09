<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * The decorative connector drawn between adjacent steps. It is `aria-hidden`
 * and exposes the owning item's `state` and the stepper `orientation` as data
 * attributes so the line can be styled to reflect progress.
 */
export interface StepperSeparatorProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { useStepperItemContext, useStepperRootContext } from './context';
import { Primitive } from '../primitive';
import { useForwardExpose } from '@robonen/vue';

const { as = 'div' } = defineProps<StepperSeparatorProps>();

const root = useStepperRootContext();
const item = useStepperItemContext();
const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="separator"
    aria-hidden="true"
    :data-orientation="root.orientation.value"
    :data-state="item.state.value"
  >
    <slot />
  </Primitive>
</template>
