<script lang="ts" generic="T extends ListboxValue = ListboxValue">
import type { ListboxValue } from './utils';
import type { PrimitiveProps } from '../primitive';

/**
 * A single selectable option (`role="option"`). Clicking, pressing Space, or
 * pressing Enter while highlighted toggles its selection and emits `select`.
 * Exposes `isSelected` / `isHighlighted` to its default slot.
 */
export interface ListboxItemProps<U extends ListboxValue = ListboxValue> extends PrimitiveProps {
  /** The value of the item. */
  value: U;
  /** Disable this item. */
  disabled?: boolean;
}

export interface ListboxItemEmits<U extends ListboxValue = ListboxValue> {
  /** Fired before the value change commits. Call `event.preventDefault()` to cancel. */
  select: [event: CustomEvent<{ originalEvent: Event; value: U }>];
}
</script>

<script setup lang="ts" generic="T extends ListboxValue = ListboxValue">
import { provideListboxItemContext, useListboxRootContext } from './context';
import { Primitive } from '../primitive';
import { computed } from 'vue';
import { useCollectionInjector } from '../collection';
import { useForwardExpose } from '@robonen/vue';
import { useId } from '../config-provider';

const { as = 'div', value, disabled = false } = defineProps<ListboxItemProps<T>>();
const emit = defineEmits<ListboxItemEmits<T>>();

const ctx = useListboxRootContext();
const { forwardRef, currentElement } = useForwardExpose();
const { CollectionItem } = useCollectionInjector();

const id = useId(undefined, 'listbox-item').value;
const isHighlighted = computed(() => currentElement.value === ctx.highlightedElement.value);
const isSelected = computed(() => ctx.isSelected(value));
const isDisabled = computed(() => disabled || ctx.disabled.value);

function handleSelect(originalEvent: Event): void {
  if (isDisabled.value) return;
  const detail = { originalEvent, value };
  const custom = new CustomEvent('listbox.select', { bubbles: true, cancelable: true, detail });
  emit('select', custom);
  if (custom.defaultPrevented) return;
  ctx.onValueChange(value);
  if (currentElement.value) ctx.changeHighlight(currentElement.value);
}

function onClick(event: MouseEvent): void {
  handleSelect(event);
}
function onKeyDown(event: KeyboardEvent): void {
  if (event.key !== ' ') return;
  event.preventDefault();
  handleSelect(event);
}
function onPointerMove(): void {
  if (!ctx.highlightOnHover.value) return;
  if (!currentElement.value || ctx.highlightedElement.value === currentElement.value) return;
  ctx.changeHighlight(currentElement.value, false, false);
}

provideListboxItemContext({ isSelected });
</script>

<template>
  <CollectionItem :value="value">
    <Primitive
      :ref="forwardRef"
      :as="as"
      :id="id"
      role="option"
      :tabindex="ctx.focusable.value ? (isHighlighted ? '0' : '-1') : '-1'"
      :aria-selected="isSelected"
      :data-state="isSelected ? 'checked' : 'unchecked'"
      :data-highlighted="isHighlighted ? '' : undefined"
      :data-disabled="isDisabled ? '' : undefined"
      :disabled="isDisabled || undefined"
      @click="onClick"
      @keydown="onKeyDown"
      @pointermove="onPointerMove"
    >
      <slot :is-selected="isSelected" :is-highlighted="isHighlighted" />
    </Primitive>
  </CollectionItem>
</template>
