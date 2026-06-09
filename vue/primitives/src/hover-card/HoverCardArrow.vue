<script lang="ts">
import type { PopperArrowProps } from '../popper';

/**
 * An optional arrow that points from the hover card content back toward the
 * trigger. Place it inside `HoverCardContent`; it tracks the resolved side and
 * alignment automatically.
 */
export interface HoverCardArrowProps extends PopperArrowProps {}
</script>

<script setup lang="ts">
import { PopperArrow } from '../popper';

const { width = 10, height = 5 } = defineProps<HoverCardArrowProps>();
</script>

<template>
  <PopperArrow :width="width" :height="height">
    <slot />
  </PopperArrow>
</template>
