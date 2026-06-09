<script lang="ts">
import type { MenuItemIndicatorProps } from '../menu';

/**
 * Renders its content only when the enclosing checkbox or radio item is checked.
 * Put a check mark or dot inside it as the selection marker.
 */
export interface MenubarItemIndicatorProps extends MenuItemIndicatorProps {}
</script>

<script setup lang="ts">
import { MenuItemIndicator } from '../menu';

const props = defineProps<MenubarItemIndicatorProps>();
</script>

<template>
  <MenuItemIndicator v-bind="props"><slot /></MenuItemIndicator>
</template>
