<script lang="ts">
import type { PopperArrowProps } from '../popper';

/**
 * An optional arrow that renders inside the menu content and points back toward
 * the anchor, visually tying the floating menu to its trigger. Place it as a
 * child of the content.
 */
export interface MenuArrowProps extends PopperArrowProps {}
</script>

<script setup lang="ts">
import { PopperArrow } from '../popper';

const props = defineProps<MenuArrowProps>();
</script>

<template>
  <PopperArrow v-bind="props">
    <slot />
  </PopperArrow>
</template>
