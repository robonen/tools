<script lang="ts">
import type { MenuSubEmits, MenuSubProps } from '../menu';

/**
 * Wraps a nested submenu, pairing a DropdownMenuSubTrigger with its
 * DropdownMenuSubContent. Owns the submenu's open state; bind `v-model:open`
 * to control or observe it.
 */
export interface DropdownMenuSubProps extends MenuSubProps {}
export type DropdownMenuSubEmits = MenuSubEmits;
</script>

<script setup lang="ts">
import { MenuSub } from '../menu';

const props = defineProps<DropdownMenuSubProps>();
const emit = defineEmits<DropdownMenuSubEmits>();
</script>

<template>
  <MenuSub v-bind="props" @update:open="emit('update:open', $event)"><slot /></MenuSub>
</template>
