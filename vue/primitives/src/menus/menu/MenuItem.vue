<script lang="ts">
import type { MenuItemImplEmits, MenuItemImplProps } from './MenuItemImpl.vue';

/**
 * A single actionable menu item that emits `select` and closes the menu when
 * activated by click, Enter, or Space. Use it for ordinary commands; call
 * `event.preventDefault()` in `select` to keep the menu open after selection.
 */
export interface MenuItemProps extends MenuItemImplProps {}
export type MenuItemEmits = MenuItemImplEmits;
</script>

<script setup lang="ts">
import { ref } from 'vue';

import { useMenuRootContext } from './context';
import MenuItemImpl from './MenuItemImpl.vue';
import { ITEM_SELECT } from './utils';

const props = defineProps<MenuItemProps>();
const emit = defineEmits<MenuItemEmits>();

const rootCtx = useMenuRootContext();

// Tracks whether the pointer went down on *this* item. If it went down
// elsewhere and is released over this item (drag-select), we synthesise a click
// so the item still activates — this also avoids Firefox getting stuck in text
// selection when the menu closes.
const isPointerDownRef = ref(false);

function handleSelect(event: Event) {
  const target = event.currentTarget as HTMLElement;
  const selectEvent = new CustomEvent(ITEM_SELECT, { bubbles: true, cancelable: true });
  // The consumer must receive the cancelable ITEM_SELECT event (not the click)
  // so `event.preventDefault()` in `@select` actually keeps the menu open.
  target.addEventListener(ITEM_SELECT, e => emit('select', e), { once: true });
  target.dispatchEvent(selectEvent);
  if (!selectEvent.defaultPrevented) {
    rootCtx.onClose();
  }
}

function handlePointerDown() {
  isPointerDownRef.value = true;
}

function handlePointerUp(event: PointerEvent) {
  if (event.defaultPrevented) return;
  // Pointer started on another item then released here: activate via click.
  if (!isPointerDownRef.value) (event.currentTarget as HTMLElement)?.click();
  isPointerDownRef.value = false;
}
</script>

<template>
  <MenuItemImpl
    v-bind="props"
    @select="handleSelect"
    @pointerdown="handlePointerDown"
    @pointerup="handlePointerUp"
  >
    <slot />
  </MenuItemImpl>
</template>
