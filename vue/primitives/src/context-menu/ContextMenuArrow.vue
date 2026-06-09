<script lang="ts">
import type { MenuArrowProps } from '../menu';

/**
 * An optional arrow that visually points from the content back toward its
 * anchor. Render it inside the content.
 */
export interface ContextMenuArrowProps extends MenuArrowProps {}
</script>

<script setup lang="ts">
import { MenuArrow } from '../menu';

const props = defineProps<ContextMenuArrowProps>();
</script>

<template>
  <MenuArrow v-bind="props"><slot /></MenuArrow>
</template>
