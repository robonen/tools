<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface SelectItemProps extends PrimitiveProps {
  /** The option value. */
  value: string;
  /** Disable this item. */
  disabled?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { useId } from '../config-provider';
import { Primitive } from '../primitive';
import { provideSelectItemContext, useSelectContentContext, useSelectRootContext } from './context';

const { as = 'div', value, disabled = false } = defineProps<SelectItemProps>();

const { forwardRef, currentElement } = useForwardExpose();
const rootCtx = useSelectRootContext();
const contentCtx = useSelectContentContext();

const textId = useId(undefined, 'select-item-text');
const isSelected = computed(() => rootCtx.value.value === value);
const isDisabled = computed(() => rootCtx.disabled.value || disabled);

const itemTextElement = shallowRef<HTMLElement | undefined>(undefined);

function onItemTextChange(el: HTMLElement | undefined) {
  itemTextElement.value = el;
  contentCtx.itemTextRefCallback(el, value);
  if (el) rootCtx.onOptionAdd(value, el.textContent?.trim() ?? '');
}

onMounted(() => {
  contentCtx.itemRefCallback(currentElement.value, value, isDisabled.value);
});

onBeforeUnmount(() => {
  rootCtx.onOptionRemove(value);
  contentCtx.itemRefCallback(undefined, value, isDisabled.value);
});

function handleSelect() {
  if (isDisabled.value) return;
  rootCtx.onValueChange(value);
}

function handlePointerEnter() {
  if (isDisabled.value) return;
  currentElement.value?.focus();
}

function handlePointerLeave() {
  contentCtx.onItemLeave();
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    handleSelect();
  }
}

provideSelectItemContext({
  value,
  isSelected,
  isDisabled,
  textId,
  onItemTextChange,
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="option"
    :aria-selected="isSelected"
    :aria-disabled="isDisabled || undefined"
    :data-state="isSelected ? 'checked' : 'unchecked'"
    :data-disabled="isDisabled ? '' : undefined"
    :tabindex="isDisabled ? undefined : -1"
    data-primitives-select-item
    @click="handleSelect"
    @pointerenter="handlePointerEnter"
    @pointerleave="handlePointerLeave"
    @keydown="handleKeyDown"
  >
    <slot />
  </Primitive>
</template>
