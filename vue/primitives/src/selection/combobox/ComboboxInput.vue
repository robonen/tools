<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The text field users type into to filter options. Owns the search term, ARIA combobox
 * semantics, and keyboard navigation (arrows, Home/End, Enter to select, Escape to close).
 */
export interface ComboboxInputProps extends PrimitiveProps {
  /** Disable the input. */
  disabled?: boolean;
  /** Focus the input on mount. */
  autoFocus?: boolean;
  /** Open the combobox when the input is focused. Combined (OR) with the Root-level `openOnFocus`. */
  openOnFocus?: boolean;
  /** Open the combobox when the input is clicked. Combined (OR) with the Root-level `openOnClick`. */
  openOnClick?: boolean;
}
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, watch } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { useComboboxRootContext } from './context';
import { INPUT_OPEN_KEYS } from './utils';

const props = defineProps<ComboboxInputProps>();
const {
  as = 'input',
  disabled = false,
  autoFocus = false,
} = props;

const { forwardRef, currentElement } = useForwardExpose();
const rootCtx = useComboboxRootContext();

// Opens when EITHER the per-input prop or the Root-level default opts in. (Boolean
// props coerce an absent value to `false`, so a nullish-merge can't distinguish
// "unset" from "false" — OR composition is the correct, back-compatible semantic.)
const shouldOpenOnFocus = computed(() => props.openOnFocus || rootCtx.openOnFocus.value);
const shouldOpenOnClick = computed(() => props.openOnClick || rootCtx.openOnClick.value);

// IME composition guard: while composing, Enter confirms the candidate and must
// not commit a combobox selection.
let isComposing = false;

const isDisabled = computed(() => disabled || rootCtx.disabled.value);
const activeDescendant = computed(() => rootCtx.selectedValueId.value);

function displayString(value: unknown): string {
  if (rootCtx.displayValue) return rootCtx.displayValue(value);
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return '';
  if (typeof value === 'object') return '';
  return String(value);
}

function syncDisplayValue() {
  const input = currentElement.value as HTMLInputElement | undefined;
  if (!input) return;
  const next = displayString(rootCtx.modelValue.value);
  if (input.value !== next) input.value = next;
}

onMounted(() => {
  const el = currentElement.value as HTMLInputElement | undefined;
  rootCtx.onInputChange(el);
  if (el) {
    el.value = rootCtx.searchTerm.value || displayString(rootCtx.modelValue.value);
  }
  if (autoFocus) setTimeout(() => el?.focus(), 1);
});

onBeforeUnmount(() => rootCtx.onInputChange(undefined));

watch(() => rootCtx.modelValue.value, () => {
  if (rootCtx.isUserInputted.value) return;
  if (!rootCtx.resetSearchTermOnSelect.value && rootCtx.searchTerm.value) return;
  rootCtx.onSearchTermChange('');
  syncDisplayValue();
}, { deep: true });

watch(() => rootCtx.searchTerm.value, (v) => {
  const input = currentElement.value as HTMLInputElement | undefined;
  if (!input) return;
  if (!v && !rootCtx.isUserInputted.value) {
    syncDisplayValue();
    return;
  }
  if (input.value !== v) input.value = v;
});

watch(() => rootCtx.filterState.value, (newState, oldState) => {
  if (oldState && oldState.count === 0 && newState.count > 0) {
    rootCtx.highlightFirstItem();
  }
});

function moveHighlight(delta: number) {
  const els = rootCtx.getVisibleItemElements();
  if (els.length === 0) return;
  const curId = rootCtx.selectedValueId.value;
  let idx = -1;
  if (curId) {
    for (let i = 0; i < els.length; i++) {
      if (els[i]!.id === curId) {
        idx = i;
        break;
      }
    }
  }
  let nextIdx: number;
  if (idx === -1) nextIdx = delta > 0 ? 0 : els.length - 1;
  else nextIdx = (idx + delta + els.length) % els.length;
  rootCtx.highlightItemById(els[nextIdx]!.id);
}

function commitHighlighted(event: KeyboardEvent) {
  const id = rootCtx.selectedValueId.value;
  if (id) {
    const info = rootCtx.allItems.value.get(id);
    // Route through the highlighted item's cancelable `select` flow so keyboard
    // Enter fires the same `select` event (and honours preventDefault) as a click.
    if (info) return info.select(event);
  }
  const value = rootCtx.selectedValue.value;
  if (value === undefined) return false;
  rootCtx.onValueChange(value);
  return true;
}

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const next = target.value;
  rootCtx.onUserInputtedChange(true);
  rootCtx.onSearchTermChange(next);
  if (!rootCtx.open.value) {
    rootCtx.onOpenChange(true);
    nextTick(() => rootCtx.highlightFirstItem());
  }
  else {
    nextTick(() => rootCtx.highlightFirstItem());
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (isDisabled.value) return;
  const { key } = event;

  if (!rootCtx.open.value && INPUT_OPEN_KEYS.includes(key)) {
    event.preventDefault();
    rootCtx.onOpenChange(true);
    return;
  }

  if (!rootCtx.open.value) return;

  switch (key) {
    case 'ArrowDown':
      event.preventDefault();
      moveHighlight(1);
      break;
    case 'ArrowUp':
      event.preventDefault();
      moveHighlight(-1);
      break;
    case 'Home': {
      event.preventDefault();
      const first = rootCtx.getVisibleItemElements()[0];
      if (first) rootCtx.highlightItemById(first.id);
      break;
    }
    case 'End': {
      event.preventDefault();
      const list = rootCtx.getVisibleItemElements();
      const last = list[list.length - 1];
      if (last) rootCtx.highlightItemById(last.id);
      break;
    }
    case 'Enter':
      // While composing an IME candidate, Enter confirms the candidate — it must
      // not select a combobox item.
      if (isComposing) break;
      if (commitHighlighted(event)) event.preventDefault();
      break;
    case 'Escape':
      event.preventDefault();
      rootCtx.onOpenChange(false);
      if (rootCtx.resetSearchTermOnBlur.value) rootCtx.onSearchTermChange('');
      break;
    case 'Tab':
      rootCtx.onOpenChange(false);
      break;
  }
}

function handleFocus() {
  if (shouldOpenOnFocus.value && !rootCtx.open.value) rootCtx.onOpenChange(true);
}

function handleClick() {
  if (shouldOpenOnClick.value && !rootCtx.open.value) rootCtx.onOpenChange(true);
}

function handleCompositionStart() {
  isComposing = true;
}

function handleCompositionEnd() {
  isComposing = false;
}

function handleBlur(event: FocusEvent) {
  if (!rootCtx.open.value) return;
  const nextFocus = event.relatedTarget as Element | null;
  if (!nextFocus) return;

  const parent = rootCtx.parentElement.value;
  const content = rootCtx.contentElement.value;
  if (parent?.contains(nextFocus) || content?.contains(nextFocus)) return;

  rootCtx.onOpenChange(false);
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
    :aria-expanded="rootCtx.open.value"
    :aria-controls="rootCtx.contentId.value"
    :aria-activedescendant="activeDescendant"
    :aria-disabled="isDisabled || undefined"
    :aria-required="rootCtx.required.value || undefined"
    :disabled="isDisabled || undefined"
    :data-state="rootCtx.open.value ? 'open' : 'closed'"
    :data-disabled="isDisabled ? '' : undefined"
    @input="handleInput"
    @keydown="handleKeyDown"
    @focus="handleFocus"
    @click="handleClick"
    @blur="handleBlur"
    @compositionstart="handleCompositionStart"
    @compositionend="handleCompositionEnd"
  >
    <slot />
  </Primitive>
</template>
