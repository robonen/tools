<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface SelectItemIndicatorProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';

import { Primitive } from '../primitive';
import { useSelectItemContext } from './context';

const { as = 'span' } = defineProps<SelectItemIndicatorProps>();
const { forwardRef } = useForwardExpose();
const itemCtx = useSelectItemContext();
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
