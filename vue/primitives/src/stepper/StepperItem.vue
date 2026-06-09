<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * A single step within the stepper. Associates its child trigger, indicator,
 * title, and description with a step number and derives that step's state
 * (`active`, `completed`, or `inactive`) from the root's current value.
 */
export interface StepperItemProps extends PrimitiveProps {
  /** 1-based index associating this item with a step. */
  step: number;
  /** Disable this specific step. */
  disabled?: boolean;
  /** Mark the step as completed regardless of current `modelValue`. */
  completed?: boolean;
}
</script>

<script setup lang="ts">
import { computed, toRef } from 'vue';
import { provideStepperItemContext, useStepperRootContext } from './context';
import { Primitive } from '../primitive';
import { useForwardExpose } from '@robonen/vue';
import { useId } from '../config-provider';

const { as = 'div', step, disabled = false, completed = false } = defineProps<StepperItemProps>();

const root = useStepperRootContext();
const { forwardRef } = useForwardExpose();

const state = computed(() => {
  if (completed) return 'completed' as const;
  if (root.value.value === step) return 'active' as const;
  if (root.value.value > step) return 'completed' as const;
  return 'inactive' as const;
});

const focusable = computed(() => {
  if (disabled || root.disabled.value) return false;
  if (!root.linear.value) return true;
  return step <= root.value.value + 1;
});

const titleId = useId(undefined, 'stepper-item-title').value;
const descriptionId = useId(undefined, 'stepper-item-description').value;

provideStepperItemContext({
  step: toRef(() => step),
  state,
  disabled: toRef(() => disabled || root.disabled.value),
  focusable,
  titleId,
  descriptionId,
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :aria-current="state === 'active' ? 'step' : undefined"
    :data-state="state"
    :data-orientation="root.orientation.value"
    :data-disabled="disabled || root.disabled.value || !focusable ? '' : undefined"
  >
    <slot :state="state" :step="step" />
  </Primitive>
</template>
