<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * Internal base for every selectable menu item (MenuItem, MenuCheckboxItem,
 * MenuRadioItem, MenuSubTrigger). It wires up roving-focus, pointer
 * highlighting, disabled state, and typeahead `textValue`, and emits `select`.
 * Not used directly — render one of the public item parts instead.
 */
export interface MenuItemImplProps extends PrimitiveProps {
  /** Whether the item is disabled, removing it from focus and selection. */
  disabled?: boolean;
  /** Optional text used to match the item during typeahead; defaults to the item's trimmed text content. */
  textValue?: string;
}
export interface MenuItemImplEmits {
  select: [event: Event];
}
</script>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';

import { RovingFocusItem } from '../roving-focus';
import { Primitive } from '../primitive';
import { useMenuContentContext } from './context';

const {
  disabled = false,
  textValue: textValueProp,
  as = 'div',
} = defineProps<MenuItemImplProps>();

const emit = defineEmits<MenuItemImplEmits>();

const contentCtx = useMenuContentContext();

const itemRef = shallowRef<HTMLElement | null>(null);
const isHighlighted = ref(false);

const textValue = computed(() => textValueProp ?? itemRef.value?.textContent?.trim() ?? '');

function handlePointerMove(event: PointerEvent) {
  if (event.pointerType === 'touch') return;
  if (disabled) return;
  if (contentCtx.onItemEnter(event)) return;
  const item = event.currentTarget as HTMLElement;
  item.focus({ preventScroll: true });
}

function handlePointerLeave(event: PointerEvent) {
  if (event.pointerType === 'touch') return;
  if (disabled) return;
  contentCtx.onItemLeave(event);
}

function handleFocus() {
  isHighlighted.value = true;
}

function handleBlur() {
  isHighlighted.value = false;
}

function handleClick(event: MouseEvent) {
  if (disabled) return;
  emit('select', event);
}

function handleKeyDown(event: KeyboardEvent) {
  if (disabled) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    const el = event.currentTarget as HTMLElement;
    el.click();
  }
}
</script>

<template>
  <RovingFocusItem :focusable="!disabled" :active="isHighlighted">
    <Primitive
      :ref="(el: unknown) => { itemRef = el as HTMLElement | null }"
      :as="as"
      role="menuitem"
      data-primitives-menu-item=""
      :data-primitive-menu-item-text-value="textValue"
      :data-highlighted="isHighlighted ? '' : undefined"
      :data-disabled="disabled ? '' : undefined"
      :aria-disabled="disabled || undefined"
      :tabindex="isHighlighted ? 0 : -1"
      @pointermove="handlePointerMove"
      @pointerleave="handlePointerLeave"
      @focus="handleFocus"
      @blur="handleBlur"
      @click="handleClick"
      @keydown="handleKeyDown"
    >
      <slot />
    </Primitive>
  </RovingFocusItem>
</template>
