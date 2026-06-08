<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface CommandInputProps extends PrimitiveProps {
  /** Controlled value; falls back to root `searchTerm`. */
  modelValue?: string;
  /** Disable the input. */
  disabled?: boolean;
  /** Focus the input on mount. */
  autoFocus?: boolean;
}

export interface CommandInputEmits {
  'update:modelValue': [value: string];
  'update:searchTerm': [value: string];
}
</script>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../primitive';
import { useCommandContext } from './context';

const {
  as = 'input',
  modelValue,
  disabled = false,
  autoFocus = false,
} = defineProps<CommandInputProps>();

const emit = defineEmits<CommandInputEmits>();

const { forwardRef, currentElement } = useForwardExpose();
const ctx = useCommandContext();

const activeDescendant = computed(() => {
  const v = ctx.selectedValue.value;
  return v === undefined ? undefined : ctx.getItemId(v);
});

onMounted(() => {
  const el = currentElement.value as HTMLInputElement | undefined;
  if (!el) return;
  if (modelValue !== undefined && modelValue !== ctx.searchTerm.value) {
    ctx.setSearchTerm(modelValue);
  }
  if (el.value !== ctx.searchTerm.value) el.value = ctx.searchTerm.value;
  if (autoFocus) setTimeout(() => el.focus(), 0);
});

watch(
  () => modelValue,
  (v) => {
    if (v === undefined) return;
    if (v !== ctx.searchTerm.value) ctx.setSearchTerm(v);
  },
);

watch(
  () => ctx.searchTerm.value,
  (v) => {
    const el = currentElement.value as HTMLInputElement | undefined;
    if (el && el.value !== v) el.value = v;
  },
);

function moveBy(delta: number) {
  const items = ctx.getSelectableItems();
  if (items.length === 0) return;
  const cur = ctx.selectedValue.value;
  const idx = cur === undefined ? -1 : items.indexOf(cur);
  let next: number;
  if (idx === -1) {
    next = delta > 0 ? 0 : items.length - 1;
  }
  else {
    next = idx + delta;
    if (ctx.loop.value) {
      next = (next + items.length) % items.length;
    }
    else {
      if (next < 0) next = 0;
      if (next > items.length - 1) next = items.length - 1;
    }
  }
  ctx.setSelectedValue(items[next]);
  scrollSelectedIntoView();
}

function moveTo(position: 'first' | 'last') {
  const items = ctx.getSelectableItems();
  if (items.length === 0) return;
  ctx.setSelectedValue(position === 'first' ? items[0] : items[items.length - 1]);
  scrollSelectedIntoView();
}

function scrollSelectedIntoView() {
  const v = ctx.selectedValue.value;
  const root = ctx.listElement.value;
  if (v === undefined || !root) return;
  const id = ctx.getItemId(v);
  const el = root.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
  el?.scrollIntoView({ block: 'nearest' });
}

function handleInput(event: Event) {
  const next = (event.target as HTMLInputElement).value;
  ctx.setSearchTerm(next);
  emit('update:modelValue', next);
  emit('update:searchTerm', next);
}

function handleKeyDown(event: KeyboardEvent) {
  if (disabled) return;
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      moveBy(1);
      break;
    case 'ArrowUp':
      event.preventDefault();
      moveBy(-1);
      break;
    case 'Home':
      event.preventDefault();
      moveTo('first');
      break;
    case 'End':
      event.preventDefault();
      moveTo('last');
      break;
    case 'Enter':
      if (ctx.selectedValue.value !== undefined) {
        event.preventDefault();
        ctx.commitSelected();
      }
      break;
  }
}
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    type="text"
    role="combobox"
    autocomplete="off"
    spellcheck="false"
    aria-autocomplete="list"
    :aria-expanded="true"
    :aria-controls="ctx.listId.value"
    :aria-activedescendant="activeDescendant"
    :aria-disabled="disabled || undefined"
    :disabled="disabled || undefined"
    :data-disabled="disabled ? '' : undefined"
    data-primitives-command-input
    @input="handleInput"
    @keydown="handleKeyDown"
  >
    <slot />
  </Primitive>
</template>
