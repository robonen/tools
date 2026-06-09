<script lang="ts">
import type { MenuItemEmits, MenuItemProps } from '../menu';

/**
 * A single actionable row in a menu. Emits `select` on click or Enter/Space and
 * closes the menu afterwards unless the event is prevented.
 */
export interface MenubarItemProps extends MenuItemProps {}
export type MenubarItemEmits = MenuItemEmits;
</script>

<script setup lang="ts">
import { MenuItem } from '../menu';

const props = defineProps<MenubarItemProps>();
const emit = defineEmits<MenubarItemEmits>();
</script>

<template>
  <MenuItem v-bind="props" @select="emit('select', $event)"><slot /></MenuItem>
</template>
