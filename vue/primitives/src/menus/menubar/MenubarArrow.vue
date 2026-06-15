<script lang="ts">
import type { MenuArrowProps } from '../menu';

/**
 * An optional arrow that points from a menu's content back toward its trigger.
 * Render it inside the content; it tracks the trigger as the menu repositions.
 */
export interface MenubarArrowProps extends MenuArrowProps {}
</script>

<script setup lang="ts">
import { MenuArrow } from '../menu';

const props = defineProps<MenubarArrowProps>();
</script>

<template>
  <MenuArrow v-bind="props"><slot /></MenuArrow>
</template>
