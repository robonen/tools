<script lang="ts">
import type { MenuCheckboxItemEmits, MenuCheckboxItemProps } from '../menu';

export interface MenubarCheckboxItemProps extends MenuCheckboxItemProps {}
export type MenubarCheckboxItemEmits = MenuCheckboxItemEmits;
</script>

<script setup lang="ts">
import { MenuCheckboxItem } from '../menu';

const props = defineProps<MenubarCheckboxItemProps>();
const emit = defineEmits<MenubarCheckboxItemEmits>();
</script>

<template>
  <MenuCheckboxItem
    v-bind="props"
    @select="emit('select', $event)"
    @update:checked="emit('update:checked', $event)"
  ><slot /></MenuCheckboxItem>
</template>
