<script lang="ts">
import type { MenuLabelProps } from '../menu';

/**
 * A non-interactive caption for a group of items. Skipped by keyboard
 * navigation; use it to title a section within the menu.
 */
export interface ContextMenuLabelProps extends MenuLabelProps {}
</script>

<script setup lang="ts">
import { MenuLabel } from '../menu';

const props = defineProps<ContextMenuLabelProps>();
</script>

<template>
  <MenuLabel v-bind="props"><slot /></MenuLabel>
</template>
