<script lang="ts">
import type { MenuRadioItemEmits, MenuRadioItemProps } from '../menu';

/**
 * One option within a MenubarRadioGroup. Selecting it sets the group's value to
 * this item's `value`; pair it with MenubarItemIndicator to show which option is
 * active.
 */
export interface MenubarRadioItemProps extends MenuRadioItemProps {}
export type MenubarRadioItemEmits = MenuRadioItemEmits;
</script>

<script setup lang="ts">
import { MenuRadioItem } from '../menu';

const props = defineProps<MenubarRadioItemProps>();
const emit = defineEmits<MenubarRadioItemEmits>();
</script>

<template>
  <MenuRadioItem v-bind="props" @select="emit('select', $event)"><slot /></MenuRadioItem>
</template>
