<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';
import type { ProgressState } from './context';

/**
 * A bar that shows the completion progress of a task, typically a horizontal
 * fill that grows from empty to full. Use it for file uploads, multi-step form
 * progress, loading indicators, or any operation whose progress you can measure
 * (or, with a `null` value, signal as indeterminate).
 *
 * The root renders the accessible `progressbar` (wiring up `aria-valuemin`,
 * `aria-valuemax`, `aria-valuenow`, `aria-valuetext`, and an `aria-label`
 * accessible name) and derives the current `state` — `indeterminate`,
 * `loading`, or `complete` — which it provides via context and exposes on the
 * `data-state` attribute. Pair it with `ProgressIndicator` for the visual fill.
 *
 * Both `modelValue` and `max` are two-way (`v-model` / `v-model:max`): bad
 * inputs (`NaN`, negatives, out-of-range, `max <= 0`) are validated, clamped,
 * and reported in development, so the rendered ARIA is always valid.
 */
export interface ProgressRootProps extends PrimitiveProps {
  /** Current value. `null` denotes an indeterminate progress bar. Two-way via `v-model`. */
  modelValue?: number | null;
  /** Maximum value. Two-way via `v-model:max`. @default 100 */
  max?: number;
  /**
   * Builds the `aria-valuetext` describing the current value in a human-readable
   * form. Receives the resolved value (`null` when indeterminate) and max.
   * @default `(v, m) => v == null ? undefined : `${Math.round((v / m) * 100)}%``
   */
  getValueLabel?: (value: number | null, max: number) => string | undefined;
  /**
   * Accessible name for the progressbar, rendered as `aria-label`. Accepts a
   * static string or a function of the resolved value and max. Provide this (or
   * an external `aria-labelledby`) so screen readers announce a meaningful name.
   */
  accessibleLabel?: string | ((value: number | null, max: number) => string | undefined);
}

export interface ProgressRootEmits {
  /** Emitted when the value changes (after validation/clamping). */
  'update:modelValue': [value: number | null];
  /** Emitted when the max changes (after validation). */
  'update:max': [value: number];
}
</script>

<script setup lang="ts">
import { Primitive } from '../../internal/primitive';
import { computed, ref } from 'vue';
import { provideProgressContext } from './context';
import { isFiniteNumber, resolveMax, resolveValue } from './utils';
import { useForwardExpose } from '@robonen/vue';

const {
  max: maxProp,
  getValueLabel = (v: number | null, m: number) => v === null ? undefined : `${Math.round((v / m) * 100)}%`,
  accessibleLabel,
  as = 'div',
} = defineProps<ProgressRootProps>();

defineEmits<ProgressRootEmits>();

const { forwardRef } = useForwardExpose();

const localValue = ref<number | null>(null);
const localMax = ref<number>(resolveMax(maxProp));

const max = defineModel<number>('max', {
  get: external => resolveMax(external ?? localMax.value),
  set: (value) => {
    const next = resolveMax(value);
    localMax.value = next;
    return next;
  },
});

const value = defineModel<number | null>({
  get: external => resolveValue(external === undefined ? localValue.value : external, max.value),
  set: (raw) => {
    const next = resolveValue(raw, max.value);
    localValue.value = next;
    return next;
  },
});

const state = computed<ProgressState>(() => {
  const v = value.value;
  if (v === null) return 'indeterminate';
  if (v >= max.value) return 'complete';
  return 'loading';
});

const progress = computed<number | null>(() => value.value === null ? null : value.value / max.value);
const percentage = computed<number | null>(() => progress.value === null ? null : Math.round(progress.value * 100));

const valueText = computed(() => getValueLabel(value.value, max.value));
const ariaLabel = computed(() => typeof accessibleLabel === 'function'
  ? accessibleLabel(value.value, max.value)
  : accessibleLabel);

provideProgressContext({
  value,
  max,
  state,
  progress,
  percentage,
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="progressbar"
    :aria-valuemin="0"
    :aria-valuemax="max"
    :aria-valuenow="isFiniteNumber(value) ? value : undefined"
    :aria-valuetext="valueText"
    :aria-label="ariaLabel"
    :data-state="state"
    :data-value="value ?? undefined"
    :data-max="max"
  >
    <slot
      :value="value"
      :max="max"
      :state="state"
      :progress="progress"
      :percentage="percentage"
    />
  </Primitive>
</template>
