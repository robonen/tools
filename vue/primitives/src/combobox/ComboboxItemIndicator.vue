<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * Marks the selected state of its parent ComboboxItem, e.g. a checkmark. Renders only when
 * that item is selected.
 */
export interface ComboboxItemIndicatorProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';

import { Primitive } from '../primitive';
import { useComboboxItemContext } from './context';

const { as = 'span' } = defineProps<ComboboxItemIndicatorProps>();
const { forwardRef } = useForwardExpose();
const itemCtx = useComboboxItemContext();
</script>

<template>
  <Primitive
    v-if="itemCtx.isSelected.value"
    :ref="forwardRef"
    :as="as"
    aria-hidden="true"
  >
    <slot />
  </Primitive>
</template>
