<script lang="ts">
import type { PopperArrowProps } from '../popper';

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
