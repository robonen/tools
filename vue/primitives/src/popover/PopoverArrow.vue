<script lang="ts">
import type { PopperArrowProps } from '../popper';

/**
 * An optional arrow that points from Content back toward the Trigger or Anchor,
 * tracking the popover's resolved side and alignment. Place inside Content;
 * pass custom SVG via the default slot to match your panel's styling.
 */
export interface PopoverArrowProps extends PopperArrowProps {}
</script>

<script setup lang="ts">
import { PopperArrow } from '../popper';

const { width = 10, height = 5 } = defineProps<PopoverArrowProps>();
</script>

<template>
  <PopperArrow :width="width" :height="height">
    <slot />
  </PopperArrow>
</template>
