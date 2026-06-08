<script lang="ts">
import type { PopperArrowProps } from '../popper';

export type ComboboxArrowProps = PopperArrowProps;
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';

import { PopperArrow } from '../popper';
import { useComboboxRootContext } from './context';

const props = defineProps<ComboboxArrowProps>();
const { forwardRef } = useForwardExpose();
const rootCtx = useComboboxRootContext();
</script>

<template>
  <PopperArrow
    v-if="rootCtx.open.value"
    :ref="forwardRef"
    v-bind="props"
  />
</template>
