<script lang="ts">
import type { MenuItemEmits, MenuItemProps } from '../menu';

export interface ContextMenuItemProps extends MenuItemProps {}
export type ContextMenuItemEmits = MenuItemEmits;
</script>

<script setup lang="ts">
import { MenuItem } from '../menu';

const props = defineProps<ContextMenuItemProps>();
const emit = defineEmits<ContextMenuItemEmits>();
</script>

<template>
  <MenuItem v-bind="props" @select="emit('select', $event)"><slot /></MenuItem>
</template>
