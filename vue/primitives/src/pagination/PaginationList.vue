<script lang="ts">
import type { PrimitiveProps } from '@/primitive';

export interface PaginationListProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import type { PaginationItem } from './utils';
import { Primitive } from '@/primitive';
import { computed } from 'vue';
import { getRange } from './utils';
import { injectPaginationContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const { as = 'div' as const } = defineProps<PaginationListProps>();

defineSlots<{
  default?: (props: {
    items: PaginationItem[];
  }) => any;
}>();

const { forwardRef } = useForwardExpose();
const ctx = injectPaginationContext();

const items = computed<PaginationItem[]>(() => getRange(
  ctx.currentPage.value,
  ctx.totalPages.value,
  ctx.siblingCount.value,
  ctx.showEdges.value,
));
</script>

<template>
  <Primitive
    :as
    :ref="forwardRef"
  >
    <slot :items="items" />
  </Primitive>
</template>
