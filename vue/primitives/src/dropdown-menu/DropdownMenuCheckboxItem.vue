<script lang="ts">
import type { MenuCheckboxItemEmits, MenuCheckboxItemProps } from '../menu';

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
