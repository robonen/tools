<script lang="ts">
import type { MenuSeparatorProps } from '../menu';

/**
 * A horizontal divider used to visually separate groups of items. Decorative
 * and skipped by keyboard navigation.
 */
export interface DropdownMenuSeparatorProps extends MenuSeparatorProps {}
</script>

<script setup lang="ts">
import { MenuSeparator } from '../menu';

const props = defineProps<DropdownMenuSeparatorProps>();
</script>

<template>
  <MenuSeparator v-bind="props"><slot /></MenuSeparator>
</template>
