<script lang="ts">
import type { MenuSubEmits, MenuSubProps } from '../menu';

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
