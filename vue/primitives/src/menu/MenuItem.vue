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
import { useMenuRootContext } from './context';
import MenuItemImpl from './MenuItemImpl.vue';
import { ITEM_SELECT } from './utils';

const props = defineProps<MenuItemProps>();
const emit = defineEmits<MenuItemEmits>();

const rootCtx = useMenuRootContext();

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
</script>

<template>
  <MenuItemImpl v-bind="props" @select="handleSelect">
    <slot />
  </MenuItemImpl>
</template>
