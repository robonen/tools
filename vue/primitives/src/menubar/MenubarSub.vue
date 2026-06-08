<script lang="ts">
import type { MenuSubEmits, MenuSubProps } from '../menu';

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
