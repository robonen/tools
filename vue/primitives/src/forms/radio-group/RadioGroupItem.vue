<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';
import type { AcceptableValue } from './utils';

/**
 * A single selectable option within a `RadioGroupRoot`, rendered by default as
 * a native `<button role="radio">`. Clicking, pressing Space, or arrow-keying
 * onto it selects its `value`; it reflects selection via `data-state` and
 * participates in the group's roving tab order. Provides context to a nested
 * `RadioGroupIndicator`.
 *
 * Emits a cancelable `select` event before the value commits — call
 * `event.preventDefault()` to veto the selection.
 */
export interface RadioGroupItemProps<T extends AcceptableValue = AcceptableValue> extends PrimitiveProps {
  /** The value this item represents — any structural value, not just strings. */
  value: T;
  /** When `true`, the item cannot be selected or focused. */
  disabled?: boolean;
  /** Marks the item as required (merged with the group-level `required`). */
  required?: boolean;
  /** Associates a `<label for=id>`; its text becomes the radio's `aria-label`. */
  id?: string;
}

export interface RadioGroupItemEmits<T extends AcceptableValue = AcceptableValue> {
  /** Fired before the value commits. Call `event.preventDefault()` to cancel. */
  select: [event: CustomEvent<{ originalEvent: Event; value: T }>];
}
</script>

<script setup lang="ts" generic="T extends AcceptableValue = AcceptableValue">
import { computed } from 'vue';
import { Primitive } from '../../internal/primitive';
import { useCollectionInjector } from '../../utilities/collection';
import { useForwardExpose } from '@robonen/vue';
import { provideRadioGroupItemContext, useRadioGroupContext } from './context';

const { value, disabled = false, required = false, id, as = 'button' } = defineProps<RadioGroupItemProps<T>>();
const emit = defineEmits<RadioGroupItemEmits<T>>();

defineSlots<{
  default?: (props: {
    /** Whether this item is the selected one. */
    checked: boolean;
    /** Whether this item is required (group-level or item-level). */
    required: boolean;
    /** Whether this item is disabled (group-level or item-level). */
    disabled: boolean;
  }) => unknown;
}>();

const ctx = useRadioGroupContext();
const { CollectionItem } = useCollectionInjector<AcceptableValue>();
const { forwardRef, currentElement } = useForwardExpose();

const isChecked = computed(() => ctx.isChecked(value));
const isDisabled = computed(() => ctx.disabled.value || disabled);
const isRequired = computed(() => ctx.required.value || required);
const dataState = computed(() => isChecked.value ? 'checked' : 'unchecked');

// Derive an accessible name from an associated `<label for=id>` for icon-only
// radios that have no visible text content of their own.
const ariaLabel = computed(() => {
  if (!id || !currentElement.value || globalThis.document === undefined) return undefined;
  const label = globalThis.document.querySelector<HTMLLabelElement>(`[for="${id}"]`);
  return label?.textContent?.trim() || undefined;
});

provideRadioGroupItemContext({
  value,
  checked: isChecked,
  disabled: isDisabled,
});

// Only one item should be in the tab order:
// - the checked one, or
// - the first enabled one if nothing is checked.
const isTabStop = computed(() => {
  if (isDisabled.value) return false;
  const el = currentElement.value;
  return !!el && ctx.tabStopElement.value === el;
});

function commit(originalEvent: Event): void {
  if (isDisabled.value) return;
  const select = new CustomEvent('radio.select', { bubbles: true, cancelable: true, detail: { originalEvent, value } });
  emit('select', select);
  if (select.defaultPrevented) return;
  ctx.setValue(value);
}

function onClick(event: MouseEvent): void {
  commit(event);
  currentElement.value?.focus();
}
function onKeyDown(event: KeyboardEvent): void {
  // Radios must not activate on Enter (WAI-ARIA): suppress the native button
  // activation so Enter does not commit a selection or submit a form.
  if (event.key === 'Enter') {
    event.preventDefault();
    return;
  }
  if (!currentElement.value) return;
  ctx.onItemKeyDown(event, currentElement.value);
}
</script>

<template>
  <CollectionItem :value="value">
    <Primitive
      :as="as"
      :ref="forwardRef"
      :id="id"
      :type="as === 'button' ? 'button' : undefined"
      role="radio"
      :aria-checked="isChecked"
      :aria-label="ariaLabel"
      :aria-required="isRequired || undefined"
      :aria-disabled="isDisabled || undefined"
      :data-state="dataState"
      :data-disabled="isDisabled ? '' : undefined"
      :tabindex="isTabStop ? 0 : -1"
      :disabled="isDisabled || undefined"
      @click="onClick"
      @keydown="onKeyDown"
    >
      <slot :checked="isChecked" :required="isRequired" :disabled="isDisabled" />
    </Primitive>
  </CollectionItem>
</template>
