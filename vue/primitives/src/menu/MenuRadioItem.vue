<script lang="ts">
import type { MenuItemImplEmits, MenuItemImplProps } from './MenuItemImpl.vue';

/**
 * A mutually-exclusive menu item rendered with `role="menuitemradio"`. Selecting
 * it sets the enclosing MenuRadioGroup's value to this item's `value`. Pair it
 * with MenuItemIndicator to show which option is active. Must be used inside a
 * MenuRadioGroup.
 */
export interface MenuRadioItemProps extends MenuItemImplProps {
  /** The unique value this item represents within its MenuRadioGroup. */
  value: string;
}
export type MenuRadioItemEmits = MenuItemImplEmits;
</script>

<script setup lang="ts">
import { computed } from 'vue';

import { provideMenuItemIndicatorContext, useMenuRadioGroupContext, useMenuRootContext } from './context';
import MenuItemImpl from './MenuItemImpl.vue';
import { ITEM_SELECT, getCheckedState } from './utils';

const { value, ...itemProps } = defineProps<MenuRadioItemProps>();
const emit = defineEmits<MenuRadioItemEmits>();

const radioCtx = useMenuRadioGroupContext();
const rootCtx = useMenuRootContext();
const checkedState = computed(() => radioCtx.modelValue.value === value);

provideMenuItemIndicatorContext({ checkedState });

function handleSelect(event: Event) {
  radioCtx.onValueChange(value);
  const selectEvent = new CustomEvent(ITEM_SELECT, { bubbles: true, cancelable: true })
  ;(event.currentTarget as HTMLElement).dispatchEvent(selectEvent);
  emit('select', event);
  if (!selectEvent.defaultPrevented) rootCtx.onClose();
}
</script>

<template>
  <MenuItemImpl
    v-bind="itemProps"
    role="menuitemradio"
    :aria-checked="checkedState"
    :data-state="getCheckedState(checkedState)"
    @select="handleSelect"
  >
    <slot />
  </MenuItemImpl>
</template>
