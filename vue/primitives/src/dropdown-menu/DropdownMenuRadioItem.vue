<script lang="ts">
import type { MenuRadioItemEmits, MenuRadioItemProps } from '../menu';

/**
 * One option within a DropdownMenuRadioGroup. Selecting it sets the group's
 * value to this item's `value`; pair it with DropdownMenuItemIndicator to show
 * which option is active.
 */
export interface DropdownMenuRadioItemProps extends MenuRadioItemProps {}
export type DropdownMenuRadioItemEmits = MenuRadioItemEmits;
</script>

<script setup lang="ts">
import { MenuRadioItem } from '../menu';

const props = defineProps<DropdownMenuRadioItemProps>();
const emit = defineEmits<DropdownMenuRadioItemEmits>();
</script>

<template>
  <MenuRadioItem v-bind="props" @select="emit('select', $event)"><slot /></MenuRadioItem>
</template>
