<script lang="ts">
import type { MenuSubTriggerProps } from '../menu';

/**
 * The item that opens its submenu on hover or ArrowRight and closes it on
 * ArrowLeft. Renders like a regular item but opens DropdownMenuSubContent
 * instead of emitting `select`.
 */
export interface DropdownMenuSubTriggerProps extends MenuSubTriggerProps {}
</script>

<script setup lang="ts">
import { MenuSubTrigger } from '../menu';

const props = defineProps<DropdownMenuSubTriggerProps>();
</script>

<template>
  <MenuSubTrigger v-bind="props"><slot /></MenuSubTrigger>
</template>
