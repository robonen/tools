<script lang="ts">
import type { PopperArrowProps } from '../popper';

/**
 * An optional arrow rendered inside `DatePickerContent` that points back at the
 * trigger/anchor. Purely decorative; place it as a child of the content.
 */
export interface DatePickerArrowProps extends PopperArrowProps {}
</script>

<script setup lang="ts">
import { PopperArrow } from '../popper';

const { width = 10, height = 5 } = defineProps<DatePickerArrowProps>();
</script>

<template>
  <PopperArrow :width="width" :height="height">
    <slot />
  </PopperArrow>
</template>
