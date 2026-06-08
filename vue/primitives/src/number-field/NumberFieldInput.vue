<script lang="ts">
import type { PrimitiveProps } from '../primitive';
export interface NumberFieldInputProps extends PrimitiveProps {

  placeholder?: string;
  name?: string;
  required?: boolean;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { useNumberFieldContext } from './context';

const props = defineProps<NumberFieldInputProps>();
const ctx = useNumberFieldContext();

const displayValue = computed(() => ctx.value.value === null ? '' : String(ctx.value.value));

function parse(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function onInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  ctx.setValue(parse(target.value));
}

function onKeyDown(event: KeyboardEvent): void {
  if (ctx.disabled.value || ctx.readonly.value) return;
  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault();
      ctx.increment();
      break;
    case 'ArrowDown':
      event.preventDefault();
      ctx.decrement();
      break;
    case 'PageUp':
      event.preventDefault();
      ctx.increment(ctx.step.value * 10);
      break;
    case 'PageDown':
      event.preventDefault();
      ctx.decrement(ctx.step.value * 10);
      break;
    case 'Home':
      if (ctx.min.value !== undefined) {
        event.preventDefault();
        ctx.setValue(ctx.min.value);
      }
      break;
    case 'End':
      if (ctx.max.value !== undefined) {
        event.preventDefault();
        ctx.setValue(ctx.max.value);
      }
      break;
  }
}
</script>

<template>
  <input
    :id="ctx.inputId"
    role="spinbutton"
    inputmode="decimal"
    autocomplete="off"
    :aria-valuemin="ctx.min.value"
    :aria-valuemax="ctx.max.value"
    :aria-valuenow="ctx.value.value ?? undefined"
    :aria-disabled="ctx.disabled.value || undefined"
    :aria-readonly="ctx.readonly.value || undefined"
    :disabled="ctx.disabled.value || undefined"
    :readonly="ctx.readonly.value || undefined"
    :placeholder="props.placeholder"
    :name="props.name"
    :required="props.required || undefined"
    :value="displayValue"
    @input="onInput"
    @keydown="onKeyDown"
  >
</template>
