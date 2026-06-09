<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * An optional text input for filtering the list. While mounted it takes over
 * focus from the content (driving the list via `aria-activedescendant`),
 * resets the highlight to the first item on each keystroke, and forwards
 * Enter / arrow / Home / End keys to the listbox. Filtering of the items
 * themselves is left to the consumer via `v-model`.
 */
export interface ListboxFilterProps extends PrimitiveProps {
  /** Controlled input value. */
  modelValue?: string;
  /** Focus on mount. */
  autoFocus?: boolean;
  /** Disable input. */
  disabled?: boolean;
}

export interface ListboxFilterEmits {
  'update:modelValue': [value: string];
}
</script>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, watchSyncEffect } from 'vue';
import { Primitive } from '../primitive';
import { useForwardExpose } from '@robonen/vue';
import { useListboxRootContext } from './context';

// Module-scoped nav key set: avoids per-keydown array allocation.
const NAV_KEYS = new Set(['ArrowUp', 'ArrowDown', 'Home', 'End']);

const {
  as = 'input',
  modelValue,
  autoFocus = false,
  disabled = false,
} = defineProps<ListboxFilterProps>();

const emit = defineEmits<ListboxFilterEmits>();

const ctx = useListboxRootContext();
const { forwardRef, currentElement } = useForwardExpose();

const localValue = ref<string>(modelValue ?? '');
watch(() => modelValue, (v) => {
  if (v === undefined || v === localValue.value) return;
  localValue.value = v;
});

const isDisabled = computed(() => disabled || ctx.disabled.value);
const activedescendant = ref<string | undefined>();
watchSyncEffect(() => {
  activedescendant.value = ctx.highlightedElement.value?.id;
});

onMounted(() => {
  ctx.focusable.value = false;
  if (!autoFocus) return;
  setTimeout(() => {
    (currentElement.value as HTMLInputElement | undefined)?.focus();
  }, 1);
});

onUnmounted(() => {
  ctx.focusable.value = true;
});

function onInput(event: Event): void {
  const v = (event.target as HTMLInputElement).value;
  localValue.value = v;
  emit('update:modelValue', v);
  ctx.highlightFirstItem();
}

function onKeyDown(event: KeyboardEvent): void {
  const { key } = event;
  if (key === 'Enter') return ctx.onKeydownEnter(event);
  if (NAV_KEYS.has(key)) {
    event.preventDefault();
    ctx.onKeydownNavigation(event);
  }
}
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    type="text"
    :value="localValue"
    :disabled="isDisabled || undefined"
    :aria-disabled="isDisabled ? true : undefined"
    :aria-activedescendant="activedescendant"
    :data-disabled="isDisabled ? '' : undefined"
    @input="onInput"
    @keydown="onKeyDown"
  >
    <slot :model-value="localValue" />
  </Primitive>
</template>
