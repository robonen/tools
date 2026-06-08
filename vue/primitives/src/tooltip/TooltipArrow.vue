<script lang="ts">
import type { PopperArrowProps } from '../popper';

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
