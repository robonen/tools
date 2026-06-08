<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface DatePickerFieldProps extends PrimitiveProps {
  /** Allow typing into the field. @default false (read-only display) */
  editable?: boolean;
  /** Display format for the rendered value. */
  format?: Intl.DateTimeFormatOptions;
  /** Placeholder text shown when no value is selected. */
  placeholderText?: string;
}
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { formatDate } from '../calendar';
import { useDatePickerRootContext } from './context';

const {
  as: _as = 'input',
  editable = false,
  format = { year: 'numeric', month: '2-digit', day: '2-digit' },
  placeholderText,
} = defineProps<DatePickerFieldProps>();

const ctx = useDatePickerRootContext();

const displayValue = computed(() => {
  if (!ctx.modelValue.value) return '';
  return formatDate(ctx.modelValue.value, format, ctx.locale.value);
});

const draft = ref(displayValue.value);
watch(displayValue, (v) => {
  draft.value = v;
});

function commit() {
  if (!editable) return;
  const text = draft.value.trim();
  if (!text) {
    ctx.modelValue.value = undefined;
    return;
  }
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime()))
    ctx.modelValue.value = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  else
    draft.value = displayValue.value;
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') commit();
}
</script>

<template>
  <input
    :value="editable ? draft : displayValue"
    :readonly="!editable"
    :placeholder="placeholderText"
    :data-primitives-date-picker-field="''"
    @input="(e) => { if (editable) draft = (e.target as HTMLInputElement).value; }"
    @blur="commit"
    @keydown="handleKeydown"
  >
</template>
