<script lang="ts">
import type { MenuRadioItemEmits, MenuRadioItemProps } from '../menu';

export interface MenubarRadioItemProps extends MenuRadioItemProps {}
export type MenubarRadioItemEmits = MenuRadioItemEmits;
</script>

<script setup lang="ts">
import { MenuRadioItem } from '../menu';

const props = defineProps<MenubarRadioItemProps>();
const emit = defineEmits<MenubarRadioItemEmits>();
</script>

<template>
  <MenuRadioItem v-bind="props" @select="emit('select', $event)"><slot /></MenuRadioItem>
</template>
