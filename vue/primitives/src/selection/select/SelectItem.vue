<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';
import type { AcceptableValue } from './utils';

/**
 * A single selectable option. Renders as a `role="option"`, registers its value
 * and text with the root, becomes (or toggles, when `multiple`) the selected
 * value on click/Enter/Space, and exposes `data-state`/`data-disabled`/
 * `data-highlighted` for styling. Holds a `SelectItemText` and, optionally, a
 * `SelectItemIndicator`. The value may be any {@link AcceptableValue}.
 */
export interface SelectItemProps<T extends AcceptableValue = AcceptableValue> extends PrimitiveProps {
  /** The option value. Must not be an empty string. */
  value: T;
  /** Disable this item. */
  disabled?: boolean;
  /**
   * Optional text used for typeahead. Defaults to the `SelectItemText` content;
   * set it when the item content is complex or non-textual.
   */
  textValue?: string;
}

export type SelectItemSelectEvent<T = AcceptableValue> = CustomEvent<{
  originalEvent: PointerEvent | KeyboardEvent;
  value: T;
}>;

export interface SelectItemEmits<T extends AcceptableValue = AcceptableValue> {
  /** Called when the item is selected. Call `event.preventDefault()` to block. */
  select: [event: SelectItemSelectEvent<T>];
}
</script>

<script setup lang="ts" generic="T extends AcceptableValue = AcceptableValue">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { getActiveElement } from '@robonen/platform/browsers';
import { useId } from '../../utilities/config-provider';
import { Primitive } from '../../internal/primitive';
import { provideSelectItemContext, useSelectContentContext, useSelectRootContext } from './context';
import { SELECTION_KEYS, valueComparator } from './utils';

const { as = 'div', value, disabled = false, textValue } = defineProps<SelectItemProps<T>>();
const emit = defineEmits<SelectItemEmits<T>>();

const { forwardRef, currentElement } = useForwardExpose();
const rootCtx = useSelectRootContext();
const contentCtx = useSelectContentContext();

if (value === ('' as T)) {
  throw new Error(
    'A <SelectItem /> must have a value prop that is not an empty string. This is because the Select value can be set to an empty string to clear the selection and show the placeholder.',
  );
}

const textId = useId(undefined, 'select-item-text');
const isFocused = ref(false);
const isSelected = computed(() => valueComparator(rootCtx.value.value, value, rootCtx.by));
const isDisabled = computed(() => rootCtx.disabled.value || disabled);

const itemTextElement = shallowRef<HTMLElement | undefined>(undefined);

function onItemTextChange(el: HTMLElement | undefined) {
  itemTextElement.value = el;
  contentCtx.itemTextRefCallback(el, value);
  const text = textValue ?? el?.textContent?.trim() ?? '';
  if (el) rootCtx.onOptionAdd({ value, disabled, textContent: text });
}

onMounted(() => {
  contentCtx.itemRefCallback(currentElement.value, value, isDisabled.value);
});

onBeforeUnmount(() => {
  rootCtx.onOptionRemove({ value, disabled, textContent: textValue ?? itemTextElement.value?.textContent?.trim() ?? '' });
  contentCtx.itemRefCallback(undefined, value, isDisabled.value);
});

async function handleSelect(event: PointerEvent | KeyboardEvent) {
  if (event.defaultPrevented) return;

  const detail = new CustomEvent('select', {
    bubbles: false,
    cancelable: true,
    detail: { originalEvent: event, value: value as T },
  }) as SelectItemSelectEvent<T>;

  await nextTick();
  emit('select', detail);
  if (detail.defaultPrevented) return;

  if (!isDisabled.value) {
    rootCtx.onValueChange(value);
  }
}

function handleClick(event: MouseEvent) {
  handleSelect(event as unknown as PointerEvent);
}

function handlePointerDown(event: PointerEvent) {
  (event.currentTarget as HTMLElement | null)?.focus({ preventScroll: true });
}

async function handlePointerMove(event: PointerEvent) {
  await nextTick();
  if (event.defaultPrevented) return;
  if (isDisabled.value) {
    contentCtx.onItemLeave();
  }
  else {
    (event.currentTarget as HTMLElement | null)?.focus({ preventScroll: true });
  }
}

async function handlePointerLeave(event: PointerEvent) {
  await nextTick();
  if (event.defaultPrevented) return;
  if (event.currentTarget === getActiveElement()) {
    contentCtx.onItemLeave();
  }
}

function handleKeyDown(event: KeyboardEvent) {
  const isTypingAhead = contentCtx.searchRef.value !== '';
  if (isTypingAhead && event.key === ' ') return;
  if (SELECTION_KEYS.includes(event.key)) {
    handleSelect(event);
  }
  // prevent page scroll on space
  if (event.key === ' ') event.preventDefault();
}

provideSelectItemContext({
  value,
  isSelected,
  isDisabled,
  isFocused,
  textId,
  onItemTextChange,
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="option"
    :aria-labelledby="textId"
    :aria-selected="isSelected"
    :aria-disabled="isDisabled || undefined"
    :data-state="isSelected ? 'checked' : 'unchecked'"
    :data-highlighted="isFocused ? '' : undefined"
    :data-disabled="isDisabled ? '' : undefined"
    :tabindex="isDisabled ? undefined : -1"
    data-primitives-select-item
    @focus="isFocused = true"
    @blur="isFocused = false"
    @click="handleClick"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerleave="handlePointerLeave"
    @touchend.prevent.stop
    @keydown="handleKeyDown"
  >
    <slot />
  </Primitive>
</template>
