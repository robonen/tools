<script lang="ts">
import type { MenuItemEmits, MenuItemProps } from '../menu';

/**
 * A single actionable command in the menu. Emits `select` on click or Enter
 * and closes the menu by default; can be `disabled` for unavailable actions.
 */
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
