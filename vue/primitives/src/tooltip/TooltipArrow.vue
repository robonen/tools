<script lang="ts">
import type { PopperArrowProps } from '../popper';

/**
 * An optional pointer rendered inside Content that visually connects the
 * tooltip to its Trigger. Place it as a child of `TooltipContent`; it tracks
 * the resolved side and alignment automatically.
 */
export interface TooltipArrowProps extends PopperArrowProps {}
</script>

<script setup lang="ts">
import { PopperArrow } from '../popper';

const { width = 10, height = 5 } = defineProps<TooltipArrowProps>();
</script>

<template>
  <PopperArrow :width="width" :height="height">
    <slot />
  </PopperArrow>
</template>
