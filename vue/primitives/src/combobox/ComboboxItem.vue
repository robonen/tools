<script lang="ts">
import type { PrimitiveProps } from '../primitive';
import type { AcceptableValue } from './utils';

/**
 * A single selectable option in the list. Registers itself for filtering and keyboard
 * navigation, toggles selection on click, and highlights on pointer move.
 */
export interface ComboboxItemProps<T extends AcceptableValue = AcceptableValue> extends PrimitiveProps {
  /** Item value. Selected/registered identity. */
  value: T;
  /** Optional explicit text for filter + typeahead. */
  textValue?: string;
  /** Disable this item. */
  disabled?: boolean;
}
</script>

<script setup lang="ts" generic="T extends AcceptableValue = AcceptableValue">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { useId } from '../config-provider';
import { Primitive } from '../primitive';
import { provideComboboxItemContext, useComboboxGroupContext, useComboboxRootContext } from './context';

const props = defineProps<ComboboxItemProps<T>>();

const rootCtx = useComboboxRootContext();
let groupCtx: { id: { value: string } } | null = null;
try {
  groupCtx = useComboboxGroupContext() as any;
}
catch {
  groupCtx = null;
}

const id = useId(undefined, 'combobox-item');
const textValue = ref(props.textValue ?? '');

const isDisabled = computed(() => rootCtx.disabled.value || !!props.disabled);
const isSelected = computed(() => rootCtx.isSelected(props.value));
const isHighlighted = computed(() => rootCtx.selectedValueId.value === id.value);
const isVisible = computed(() => rootCtx.filterState.value.items.has(id.value));

// defineExpose must run BEFORE useForwardExpose: the composable absorbs a prior
// expose() into the forwarded object, while a later one would trigger Vue's
// "expose() should be called only once" warning and clobber the forwarded API.
defineExpose({ id, isVisible, isHighlighted });
const { forwardRef, currentElement } = useForwardExpose();

function syncRegistration() {
  rootCtx.onItemRegister(id.value, {
    value: props.value,
    textValue: textValue.value,
    disabled: isDisabled.value,
  });
}

onMounted(() => {
  const el = currentElement.value as HTMLElement | undefined;
  if (el && !props.textValue) {
    textValue.value = el.textContent?.trim() ?? '';
  }
  syncRegistration();
  if (groupCtx) rootCtx.onGroupItemRegister(groupCtx.id.value, id.value);
});

watch(() => [props.value, props.textValue, isDisabled.value], () => {
  if (props.textValue) textValue.value = props.textValue;
  syncRegistration();
});

onBeforeUnmount(() => {
  rootCtx.onItemUnregister(id.value);
  if (groupCtx) rootCtx.onGroupItemUnregister(groupCtx.id.value, id.value);
  if (rootCtx.selectedValueId.value === id.value) {
    rootCtx.onSelectedValueChange(undefined, undefined);
  }
});

function handleClick(event: MouseEvent) {
  if (isDisabled.value) return;
  event.preventDefault();
  rootCtx.onValueChange(props.value);
  if (rootCtx.resetSearchTermOnSelect.value && !rootCtx.multiple.value) {
    rootCtx.onSearchTermChange('');
    rootCtx.onUserInputtedChange(false);
  }
}

function handlePointerMove() {
  if (isDisabled.value) return;
  if (rootCtx.selectedValueId.value !== id.value) {
    rootCtx.onSelectedValueChange(props.value, id.value);
  }
}

provideComboboxItemContext({
  id,
  value: props.value,
  textValue,
  isSelected,
  isDisabled,
});
</script>

<template>
  <Primitive
    v-show="isVisible"
    :ref="forwardRef"
    :id="id"
    :as="props.as ?? 'div'"
    role="option"
    :aria-selected="isSelected"
    :aria-disabled="isDisabled || undefined"
    :data-state="isSelected ? 'checked' : 'unchecked'"
    :data-highlighted="isHighlighted ? '' : undefined"
    :data-disabled="isDisabled ? '' : undefined"
    :tabindex="-1"
    data-primitives-combobox-item
    @click="handleClick"
    @pointermove="handlePointerMove"
  >
    <slot :selected="isSelected" :highlighted="isHighlighted" />
  </Primitive>
</template>
