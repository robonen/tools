<script lang="ts">
import type { MenuCheckboxItemEmits, MenuCheckboxItemProps } from '../menu';

/**
 * A menu item that toggles a boolean (or indeterminate) state. Bind
 * `v-model:checked` to track the value; pair it with DropdownMenuItemIndicator
 * to render a check mark when active.
 */
export interface DropdownMenuCheckboxItemProps extends MenuCheckboxItemProps {}
export type DropdownMenuCheckboxItemEmits = MenuCheckboxItemEmits;
</script>

<script setup lang="ts">
import { MenuCheckboxItem } from '../menu';

const props = defineProps<DropdownMenuCheckboxItemProps>();
const emit = defineEmits<DropdownMenuCheckboxItemEmits>();
</script>

<template>
  <MenuCheckboxItem
    v-bind="props"
    @select="emit('select', $event)"
    @update:checked="emit('update:checked', $event)"
  ><slot /></MenuCheckboxItem>
</template>
