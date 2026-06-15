<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';
import type { StepperOrientation } from './context';

/**
 * The decorative connector drawn between adjacent steps. It is `aria-hidden`
 * and exposes the owning item's `state` and the stepper `orientation` as data
 * attributes so the line can be styled to reflect progress.
 */
export interface StepperSeparatorProps extends PrimitiveProps {
  /**
   * Override the connector orientation. Defaults to the stepper's own
   * orientation, so you usually do not need to set it.
   */
  orientation?: StepperOrientation;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { useStepperItemContext, useStepperRootContext } from './context';
import { Primitive } from '../../internal/primitive';
import { useForwardExpose } from '@robonen/vue';

const { as = 'div', orientation } = defineProps<StepperSeparatorProps>();

const root = useStepperRootContext();
const item = useStepperItemContext();
const { forwardRef } = useForwardExpose();

const resolvedOrientation = computed(() => orientation ?? root.orientation.value);
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="separator"
    aria-hidden="true"
    :data-orientation="resolvedOrientation"
    :data-state="item.state.value"
  >
    <slot />
  </Primitive>
</template>
