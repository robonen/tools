<script lang="ts">
import type { PopperArrowProps } from '../popper';

/**
 * An optional arrow that visually points from the popup back to the anchor. Renders only
 * while the combobox is open. Place inside ComboboxContent.
 */
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
