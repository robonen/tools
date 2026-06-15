<script lang="ts">
import type { MenuSeparatorProps } from '../menu';

/**
 * A visual divider between groups of items, exposed as `role="separator"` and
 * skipped by keyboard navigation.
 */
export interface ContextMenuSeparatorProps extends MenuSeparatorProps {}
</script>

<script setup lang="ts">
import { MenuSeparator } from '../menu';

const props = defineProps<ContextMenuSeparatorProps>();
</script>

<template>
  <MenuSeparator v-bind="props"><slot /></MenuSeparator>
</template>
