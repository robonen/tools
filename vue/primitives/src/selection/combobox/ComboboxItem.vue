<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';
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

/**
 * Detail of the cancelable `select` event. Call `preventDefault()` on the event
 * (or read `defaultPrevented`) to block the default selection/auto-close — the
 * interception point for create-on-enter and custom selection flows.
 */
export interface ComboboxItemSelectEvent<T extends AcceptableValue = AcceptableValue> extends CustomEvent {
  detail: { value: T; originalEvent: PointerEvent | KeyboardEvent | MouseEvent };
}

export interface ComboboxItemEmits<T extends AcceptableValue = AcceptableValue> {
  /** Cancelable. Fires before selection commits; `preventDefault()` blocks it. */
  select: [event: ComboboxItemSelectEvent<T>];
}
</script>

<script setup lang="ts" generic="T extends AcceptableValue = AcceptableValue">
import type { ComboboxGroupContext } from './context';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { useId } from '../../utilities/config-provider';
import { Primitive } from '../../internal/primitive';
import { provideComboboxItemContext, useComboboxGroupContext, useComboboxRootContext } from './context';

const props = defineProps<ComboboxItemProps<T>>();
const emit = defineEmits<ComboboxItemEmits<T>>();

if (props.value === ('' as unknown as T)) {
  throw new Error(
    '[ComboboxItem] `value` must not be an empty string — the empty string is reserved for the cleared selection state.',
  );
}

const rootCtx = useComboboxRootContext();
let groupCtx: ComboboxGroupContext | null = null;
try {
  groupCtx = useComboboxGroupContext();
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
    select: trySelect,
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

/**
 * Runs the selection flow guarded by a cancelable `select` event. Consumers can
 * call `preventDefault()` on the event to block selection (e.g. create-on-enter).
 * Returns `true` when selection committed.
 */
function trySelect(originalEvent: PointerEvent | KeyboardEvent | MouseEvent): boolean {
  if (isDisabled.value) return false;
  const selectEvent = new CustomEvent('combobox-item-select', {
    bubbles: false,
    cancelable: true,
    detail: { value: props.value, originalEvent },
  }) as ComboboxItemSelectEvent<T>;
  emit('select', selectEvent);
  if (selectEvent.defaultPrevented) return false;

  rootCtx.onValueChange(props.value);
  if (rootCtx.resetSearchTermOnSelect.value && !rootCtx.multiple.value) {
    rootCtx.onSearchTermChange('');
    rootCtx.onUserInputtedChange(false);
  }
  return true;
}

function handleClick(event: MouseEvent) {
  if (isDisabled.value) return;
  event.preventDefault();
  trySelect(event);
}

function handlePointerMove() {
  if (isDisabled.value || !rootCtx.highlightOnHover.value) return;
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
