<script lang="ts">
import type { MenuItemImplEmits, MenuItemImplProps } from './MenuItemImpl.vue';
import type { CheckedState } from './types';

export interface MenuCheckboxItemProps extends MenuItemImplProps {
  checked?: CheckedState;
  defaultChecked?: CheckedState;
}
export interface MenuCheckboxItemEmits extends MenuItemImplEmits {
  'update:checked': [value: CheckedState];
}
</script>

<script setup lang="ts">
import { computed, ref } from 'vue';

import { provideMenuItemIndicatorContext, useMenuRootContext } from './context';
import MenuItemImpl from './MenuItemImpl.vue';
import { ITEM_SELECT, getCheckedState, isIndeterminate } from './utils';

const {
  checked: checkedProp,
  defaultChecked = false,
  ...itemProps
} = defineProps<MenuCheckboxItemProps>();

const emit = defineEmits<MenuCheckboxItemEmits>();
const rootCtx = useMenuRootContext();

const local = ref<CheckedState>(defaultChecked);
const checkedState = computed<CheckedState>(() => checkedProp !== undefined ? checkedProp : local.value);

provideMenuItemIndicatorContext({ checkedState });

function handleSelect(event: Event) {
  const next: CheckedState = isIndeterminate(checkedState.value) ? true : !checkedState.value;
  local.value = next;
  emit('update:checked', next);

  const selectEvent = new CustomEvent(ITEM_SELECT, { bubbles: true, cancelable: true })
  ;(event.currentTarget as HTMLElement).dispatchEvent(selectEvent);
  emit('select', event);
  if (!selectEvent.defaultPrevented) rootCtx.onClose();
}
</script>

<template>
  <MenuItemImpl
    v-bind="itemProps"
    role="menuitemcheckbox"
    :aria-checked="isIndeterminate(checkedState) ? 'mixed' : checkedState"
    :data-state="getCheckedState(checkedState)"
    @select="handleSelect"
  >
    <slot />
  </MenuItemImpl>
</template>
