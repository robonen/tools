<script lang="ts">
import type { MenuArrowProps } from '../menu';

/**
 * An optional arrow that points from the content back toward the trigger.
 * Render it inside the content; it tracks the trigger as the menu repositions.
 */
export interface DropdownMenuArrowProps extends MenuArrowProps {}
</script>

<script setup lang="ts">
import { MenuArrow } from '../menu';

const props = defineProps<DropdownMenuArrowProps>();
</script>

<template>
  <MenuArrow v-bind="props"><slot /></MenuArrow>
</template>
