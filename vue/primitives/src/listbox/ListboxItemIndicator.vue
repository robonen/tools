<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface ListboxItemIndicatorProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { useForwardExpose } from '@robonen/vue';
import { useListboxItemContext } from './context';

const { as = 'span' } = defineProps<ListboxItemIndicatorProps>();

const item = useListboxItemContext();
const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    v-if="item.isSelected.value"
    :ref="forwardRef"
    :as="as"
    aria-hidden="true"
  >
    <slot />
  </Primitive>
</template>
