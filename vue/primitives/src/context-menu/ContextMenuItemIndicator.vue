<script lang="ts">
import type { MenuItemIndicatorProps } from '../menu';

export interface ContextMenuItemIndicatorProps extends MenuItemIndicatorProps {}
</script>

<script setup lang="ts">
import { MenuItemIndicator } from '../menu';

const props = defineProps<ContextMenuItemIndicatorProps>();
</script>

<template>
  <MenuItemIndicator v-bind="props"><slot /></MenuItemIndicator>
</template>
