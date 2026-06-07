<script lang="ts">
import type { PrimitiveProps } from '../primitive';
export interface NumberFieldRootProps extends PrimitiveProps {
  modelValue?: number | null;
  defaultValue?: number | null;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  readonly?: boolean;

}

export interface NumberFieldRootEmits {
  'update:modelValue': [value: number | null];
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

const { step = 1, disabled = false, readonly = false, min, max, modelValue, defaultValue, as = 'div' } = defineProps<NumberFieldRootProps>();

const { forwardRef } = useForwardExpose();

const emit = defineEmits<NumberFieldRootEmits>();

const localValue = ref<number | null>(
  modelValue !== undefined ? modelValue : (defaultValue ?? null),
);

watch(() => modelValue, (v) => {
  if (v === undefined) return;
  if (v === localValue.value) return;
  localValue.value = v;
});

function setValue(v: number | null): void {
  if (disabled || readonly) return;
  const next = v === null ? null : clamp(v, min ?? -Infinity, max ?? Infinity);
  if (next === localValue.value) return;
  localValue.value = next;
  emit('update:modelValue', next);
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
