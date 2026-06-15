<script lang="ts">
import type { MenuSeparatorProps } from '../menu';

/**
 * A horizontal divider used to visually separate groups of items within a menu.
 * Decorative and skipped by keyboard navigation.
 */
export interface MenubarSeparatorProps extends MenuSeparatorProps {}
</script>

<script setup lang="ts">
import { MenuSeparator } from '../menu';

const props = defineProps<MenubarSeparatorProps>();
</script>

<template>
  <MenuSeparator v-bind="props"><slot /></MenuSeparator>
</template>
