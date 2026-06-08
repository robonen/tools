<script lang="ts">
import type { MenuRadioItemEmits, MenuRadioItemProps } from '../menu';

export interface ContextMenuRadioItemProps extends MenuRadioItemProps {}
export type ContextMenuRadioItemEmits = MenuRadioItemEmits;
</script>

<script setup lang="ts">
import { MenuRadioItem } from '../menu';

const props = defineProps<ContextMenuRadioItemProps>();
const emit = defineEmits<ContextMenuRadioItemEmits>();
</script>

<template>
  <MenuRadioItem v-bind="props" @select="emit('select', $event)"><slot /></MenuRadioItem>
</template>
