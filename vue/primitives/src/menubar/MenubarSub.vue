<script lang="ts">
import type { MenuSubEmits, MenuSubProps } from '../menu';

/**
 * Wraps a nested submenu, pairing a MenubarSubTrigger with its
 * MenubarSubContent. Owns the submenu's open state; bind `v-model:open` to
 * control or observe it.
 */
export interface MenubarSubProps extends MenuSubProps {}
export type MenubarSubEmits = MenuSubEmits;
</script>

<script setup lang="ts">
import { MenuSub } from '../menu';

const props = defineProps<MenubarSubProps>();
const emit = defineEmits<MenubarSubEmits>();
</script>

<template>
  <MenuSub v-bind="props" @update:open="emit('update:open', $event)"><slot /></MenuSub>
</template>
