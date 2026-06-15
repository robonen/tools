<script lang="ts">
import type { AcceptableValue } from './utils';

/**
 * A real, visually-hidden native `<select>` mirrored from the custom control so
 * the value participates in native form submission, autofill, and `change`
 * bubbling. Renders an `<option>` per registered item, supports `multiple`, and
 * writes through the native value setter so frameworks that observe form
 * controls (and the browser's autofill) see the change exactly as for a real
 * `<select>`. Internal — rendered by `SelectRoot` when a `name` is set inside a
 * form.
 */
export interface SelectBubbleSelectProps {
  autocomplete?: string;
  disabled?: boolean;
  multiple?: boolean;
  name?: string;
  required?: boolean;
  /** Registered option values, rendered as native `<option>`s. */
  options: AcceptableValue[];
  /** Current model value(s). */
  value?: AcceptableValue | AcceptableValue[];
}
</script>

<script setup lang="ts">
import { watch } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { VisuallyHidden } from '../../utilities/visually-hidden';

const props = defineProps<SelectBubbleSelectProps>();
const emit = defineEmits<{ change: [value: string] }>();

defineOptions({ inheritAttrs: false });

const { forwardRef, currentElement } = useForwardExpose();

// Serialise an option value to the string a native <option> can carry.
function serialize(value: AcceptableValue | undefined): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// Bubble a native `change` event to the surrounding form when the value
// changes programmatically, using the native value setter so synthetic-event
// systems observe it.
watch(() => props.value, (cur, prev) => {
  if (cur === prev) return;
  if (globalThis.window === undefined) return;
  const el = currentElement.value as HTMLSelectElement | undefined;
  if (!el) return;

  const descriptor = Object.getOwnPropertyDescriptor(globalThis.HTMLSelectElement.prototype, 'value');
  const setValue = descriptor?.set;
  if (!setValue) return;

  const next = serialize(Array.isArray(cur) ? cur[0] : cur);
  setValue.call(el, next);
  el.dispatchEvent(new Event('change', { bubbles: true }));
});

// Autofill triggers an `input` event on the native <select>; mirror it back.
function handleInput(event: Event) {
  emit('change', (event.target as HTMLSelectElement).value);
}
</script>

<template>
  <VisuallyHidden as="template" feature="hidden">
    <select
      :ref="forwardRef"
      :name="name"
      :required="required || undefined"
      :disabled="disabled || undefined"
      :multiple="multiple || undefined"
      :autocomplete="autocomplete"
      aria-hidden="true"
      tabindex="-1"
      v-bind="$attrs"
      @input="handleInput"
    >
      <option v-for="opt in options" :key="serialize(opt)" :value="serialize(opt)">{{ serialize(opt) }}</option>
    </select>
  </VisuallyHidden>
</template>
