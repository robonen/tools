<script lang="ts">
import type { PopperArrowProps } from '../popper';

/**
 * An optional arrow that points from the content back to the trigger. Only
 * meaningful with `position="popper"`, since it relies on the popper placement;
 * render it inside `SelectContent`.
 */
export type SelectArrowProps = PopperArrowProps;
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';

import { PopperArrow } from '../popper';

const props = defineProps<SelectArrowProps>();
const { forwardRef } = useForwardExpose();
</script>

<template>
  <PopperArrow
    :ref="forwardRef"
    v-bind="props"
  />
</template>
