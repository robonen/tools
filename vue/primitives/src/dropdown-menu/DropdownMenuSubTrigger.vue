<script lang="ts">
import type { MenuSubTriggerProps } from '../menu';

export interface DropdownMenuSubTriggerProps extends MenuSubTriggerProps {}
</script>

<script setup lang="ts">
import { MenuSubTrigger } from '../menu';

const props = defineProps<DropdownMenuSubTriggerProps>();
</script>

<template>
  <MenuSubTrigger v-bind="props"><slot /></MenuSubTrigger>
</template>
