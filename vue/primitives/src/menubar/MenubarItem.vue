<script lang="ts">
import type { MenuItemEmits, MenuItemProps } from '../menu';

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
