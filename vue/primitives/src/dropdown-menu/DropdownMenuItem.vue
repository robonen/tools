<script lang="ts">
import type { MenuItemEmits, MenuItemProps } from '../menu';

/**
 * A single actionable row in the menu. Emits `select` on click or
 * Enter/Space and closes the menu afterwards unless the event is prevented.
 */
export interface DropdownMenuItemProps extends MenuItemProps {}
export type DropdownMenuItemEmits = MenuItemEmits;
</script>

<script setup lang="ts">
import { MenuItem } from '../menu';

const props = defineProps<DropdownMenuItemProps>();
const emit = defineEmits<DropdownMenuItemEmits>();
</script>

<template>
  <MenuItem v-bind="props" @select="emit('select', $event)"><slot /></MenuItem>
</template>
