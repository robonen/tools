<script lang="ts">
import type { MenuItemEmits, MenuItemProps } from '../menu';

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
