<script lang="ts">
import type { PrimitiveProps } from '../primitive';
import type { ProgressState } from './context';

export interface ProgressRootProps extends PrimitiveProps {
  /** Current value. `null` denotes an indeterminate progress bar. */
  modelValue?: number | null;
  /** Maximum value. @default 100 */
  max?: number;
  /** Accessible label (use when no external label is provided). */
  getValueLabel?: (value: number, max: number) => string;
}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { computed, toRef } from 'vue';
import { provideProgressContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const {
  modelValue = null,
  max = 100,
  getValueLabel = (v: number, m: number) => `${Math.round((v / m) * 100)}%`,
  as = 'div',
} = defineProps<ProgressRootProps>();

const { forwardRef } = useForwardExpose();

// Identity passthroughs via `toRef` — reactive without `computed`'s effect/cache.
const value = toRef(() => modelValue);
const maxRef = toRef(() => max);

const state = computed<ProgressState>(() => {
  const v = modelValue;
  if (v === null || v === undefined) return 'indeterminate';
  if (v >= max) return 'complete';
  return 'loading';
});

const valueLabel = computed(() => value.value === null || value.value === undefined ? undefined : getValueLabel(value.value, max));

provideProgressContext({
  value,
  max: maxRef,
  state,
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="progressbar"
    :aria-valuemin="0"
    :aria-valuemax="max"
    :aria-valuenow="value ?? undefined"
    :aria-valuetext="valueLabel"
    :data-state="state"
    :data-value="value ?? undefined"
    :data-max="max"
  >
    <slot :value="value" :max="max" :state="state" />
  </Primitive>
</template>
