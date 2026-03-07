<script lang="ts">
import type { PrimitiveProps } from '@/primitive';

export interface PaginationListProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '@/primitive';
import { injectPaginationContext } from './context';
import { getRange } from './utils';
import type { PaginationItem } from './utils';

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
