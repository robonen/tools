<script lang="ts">
import type { MenuSubTriggerProps } from '../menu';

export interface ContextMenuSubTriggerProps extends MenuSubTriggerProps {}
</script>

<script setup lang="ts">
import { MenuSubTrigger } from '../menu';

const props = defineProps<ContextMenuSubTriggerProps>();
</script>

<template>
  <MenuSubTrigger v-bind="props"><slot /></MenuSubTrigger>
</template>
