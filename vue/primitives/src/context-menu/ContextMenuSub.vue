<script lang="ts">
import type { MenuSubEmits, MenuSubProps } from '../menu';

/**
 * Wraps a nested submenu, pairing a `ContextMenuSubTrigger` with its
 * `ContextMenuSubContent` and owning that submenu's open state. Listen to
 * `update:open` to track expansion.
 */
export interface ContextMenuSubProps extends MenuSubProps {}
export type ContextMenuSubEmits = MenuSubEmits;
</script>

<script setup lang="ts">
import { MenuSub } from '../menu';

const props = defineProps<ContextMenuSubProps>();
const emit = defineEmits<ContextMenuSubEmits>();
</script>

<template>
  <MenuSub v-bind="props" @update:open="emit('update:open', $event)"><slot /></MenuSub>
</template>
