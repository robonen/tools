<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * A numeric input with stepper controls, keyboard increment/decrement, and
 * optional clamping. The interactive root: it owns the value (controlled via
 * `v-model` / `update:modelValue` or uncontrolled via `defaultValue`), clamps
 * to `min`/`max`, applies `step`, and provides context to `NumberFieldInput`,
 * `NumberFieldIncrement`, and `NumberFieldDecrement`. Use it whenever you need
 * a styled number entry with spinner buttons and arrow-key support.
 */
export interface NumberFieldRootProps extends PrimitiveProps {
  defaultValue?: number | null;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  readonly?: boolean;

}

export interface NumberFieldRootEmits {
  valueChange: [value: number | null];
}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { ref, toRef, watch } from 'vue';
import { provideNumberFieldContext } from './context';
import { useForwardExpose } from '@robonen/vue';
import { clamp } from '@robonen/stdlib';
import { useId } from '../config-provider';

const { step = 1, disabled = false, readonly = false, min, max, defaultValue, as = 'div' } = defineProps<NumberFieldRootProps>();

const { forwardRef } = useForwardExpose();

const emit = defineEmits<NumberFieldRootEmits>();

// `defineModel` drives both controlled (`v-model`) and uncontrolled modes; in
// uncontrolled mode `model.value` is `undefined` until first write, so the
// internal `localValue` below seeds from `defaultValue` and stays the live
// source of truth (synchronous multi-step updates can't wait on a prop re-flow).
const model = defineModel<number | null>();

const localValue = ref<number | null>(
  model.value !== undefined ? model.value : (defaultValue ?? null),
);

watch(model, (v) => {
  if (v === undefined) return;
  if (v === localValue.value) return;
  localValue.value = v;
});

function setValue(v: number | null): void {
  if (disabled || readonly) return;
  const next = v === null ? null : clamp(v, min ?? -Infinity, max ?? Infinity);
  if (next === localValue.value) return;
  localValue.value = next;
  // `defineModel` emits `update:modelValue` on write — no manual emit needed.
  model.value = next;
  emit('valueChange', next);
}

function increment(delta = step): void {
  const base = localValue.value ?? min ?? 0;
  setValue(base + delta);
}
function decrement(delta = step): void {
  const base = localValue.value ?? min ?? 0;
  setValue(base - delta);
}

const inputId = useId(undefined, 'number-field-input').value;

provideNumberFieldContext({
  value: localValue,
  // Identity passthroughs via `toRef` — reactive without `computed`'s effect/cache.
  min: toRef(() => min),
  max: toRef(() => max),
  step: toRef(() => step),
  disabled: toRef(() => disabled),
  readonly: toRef(() => readonly),
  increment,
  decrement,
  setValue,
  inputId,
});
defineExpose({ value: localValue, increment, decrement, setValue });
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :data-disabled="disabled ? '' : undefined"
    :data-readonly="readonly ? '' : undefined"
  >
    <slot :value="localValue" :increment="increment" :decrement="decrement" />
  </Primitive>
</template>
