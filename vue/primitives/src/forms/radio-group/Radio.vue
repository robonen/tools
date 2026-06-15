<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';
import type { AcceptableValue } from './utils';

/**
 * A standalone radio, usable on its own outside a `RadioGroupRoot`. It owns its
 * own `checked` state (controlled via `v-model:checked` or uncontrolled), and
 * — when given a `name` inside a `<form>` — renders a hidden native input so its
 * value participates in form submission and native validation.
 *
 * Like `RadioGroupItem` it emits a cancelable `select` event before toggling;
 * call `event.preventDefault()` to veto.
 */
export interface RadioProps extends PrimitiveProps {
  /** Element `id`, also used to derive an `aria-label` from an associated `<label for=id>`. */
  id?: string;
  /** The value submitted with the owning form when `name` is set. */
  value?: AcceptableValue;
  /** When `true`, the radio cannot be interacted with. */
  disabled?: boolean;
  /** Marks the radio as required for assistive tech and native validation. */
  required?: boolean;
  /** Name of the hidden form field submitted with the owning `<form>`. */
  name?: string;
}

export interface RadioEmits {
  /** Fired before `checked` flips. Call `event.preventDefault()` to cancel. */
  select: [event: CustomEvent<{ originalEvent: Event; value: AcceptableValue | undefined }>];
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { Primitive } from '../../internal/primitive';
import { useForwardExpose } from '@robonen/vue';

const { value, disabled = false, required = false, name, id, as = 'button' } = defineProps<RadioProps>();
const emit = defineEmits<RadioEmits>();

const checked = defineModel<boolean>('checked', { default: false });

defineSlots<{
  default?: (props: { checked: boolean }) => unknown;
}>();

const { forwardRef, currentElement } = useForwardExpose();

const dataState = computed(() => checked.value ? 'checked' : 'unchecked');

const isFormControl = computed(() => {
  const el = currentElement.value;
  return !!el && !!el.closest('form');
});

const ariaLabel = computed(() => {
  if (!id || !currentElement.value || globalThis.document === undefined) return undefined;
  const label = globalThis.document.querySelector<HTMLLabelElement>(`[for="${id}"]`);
  return label?.textContent?.trim() || (value !== undefined && value !== null && typeof value !== 'object' ? String(value) : undefined);
});

function onClick(event: MouseEvent): void {
  if (disabled) return;
  const select = new CustomEvent('radio.select', { bubbles: true, cancelable: true, detail: { originalEvent: event, value } });
  emit('select', select);
  if (select.defaultPrevented) return;
  checked.value = true;
}
function onKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Enter') event.preventDefault();
}
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :id="id"
    :type="as === 'button' ? 'button' : undefined"
    role="radio"
    :aria-checked="checked"
    :aria-label="ariaLabel"
    :aria-required="required || undefined"
    :aria-disabled="disabled || undefined"
    :data-state="dataState"
    :data-disabled="disabled ? '' : undefined"
    :disabled="disabled || undefined"
    @click="onClick"
    @keydown="onKeyDown"
  >
    <slot :checked="checked" />

    <input
      v-if="isFormControl && name"
      type="radio"
      tabindex="-1"
      aria-hidden="true"
      :name="name"
      :value="value === undefined || value === null ? '' : (typeof value === 'object' ? JSON.stringify(value) : String(value))"
      :checked="checked"
      :required="required"
      :disabled="disabled"
      style="position: absolute; pointer-events: none; opacity: 0; margin: 0; transform: translateX(-100%);"
    >
  </Primitive>
</template>
