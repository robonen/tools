<script lang="ts">
import type { MenuSubTriggerProps } from '../menu';

/**
 * The item that opens a nested submenu on hover or arrow-key, anchoring its
 * `ContextMenuSubContent`. Place it as the first child of a `ContextMenuSub`.
 */
export interface ContextMenuSubTriggerProps extends MenuSubTriggerProps {}
</script>

<script setup lang="ts">
import { MenuSubTrigger } from '../menu';

const props = defineProps<ContextMenuSubTriggerProps>();
</script>

<template>
  <MenuSubTrigger v-bind="props"><slot /></MenuSubTrigger>
</template>
