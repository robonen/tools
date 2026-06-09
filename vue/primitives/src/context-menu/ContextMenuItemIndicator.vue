<script lang="ts">
import type { MenuItemIndicatorProps } from '../menu';

/**
 * Renders its content only when the parent checkbox or radio item is checked.
 * Place it inside a `ContextMenuCheckboxItem` or `ContextMenuRadioItem` to show
 * the check or dot.
 */
export interface ContextMenuItemIndicatorProps extends MenuItemIndicatorProps {}
</script>

<script setup lang="ts">
import { MenuItemIndicator } from '../menu';

const props = defineProps<ContextMenuItemIndicatorProps>();
</script>

<template>
  <MenuItemIndicator v-bind="props"><slot /></MenuItemIndicator>
</template>
