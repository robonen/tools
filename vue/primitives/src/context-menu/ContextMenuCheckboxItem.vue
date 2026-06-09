<script lang="ts">
import type { MenuCheckboxItemEmits, MenuCheckboxItemProps } from '../menu';

/**
 * An item that toggles an on/off (or indeterminate) state, exposing
 * `aria-checked` for assistive tech. Bind `v-model:checked` and pair it with a
 * `ContextMenuItemIndicator` to render the checkmark.
 */
export interface ContextMenuCheckboxItemProps extends MenuCheckboxItemProps {}
export type ContextMenuCheckboxItemEmits = MenuCheckboxItemEmits;
</script>

<script setup lang="ts">
import { MenuCheckboxItem } from '../menu';

const props = defineProps<ContextMenuCheckboxItemProps>();
const emit = defineEmits<ContextMenuCheckboxItemEmits>();
</script>

<template>
  <MenuCheckboxItem
    v-bind="props"
    @select="emit('select', $event)"
    @update:checked="emit('update:checked', $event)"
  ><slot /></MenuCheckboxItem>
</template>
