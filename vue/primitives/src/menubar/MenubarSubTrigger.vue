<script lang="ts">
import type { MenuSubTriggerProps } from '../menu';

/**
 * The item that opens its submenu on hover or ArrowRight and closes it on
 * ArrowLeft. Renders like a regular item but opens MenubarSubContent instead of
 * emitting `select`.
 */
export interface MenubarSubTriggerProps extends MenuSubTriggerProps {}
</script>

<script setup lang="ts">
import { MenuSubTrigger } from '../menu';

const props = defineProps<MenubarSubTriggerProps>();
</script>

<template>
  <MenuSubTrigger v-bind="props"><slot /></MenuSubTrigger>
</template>
