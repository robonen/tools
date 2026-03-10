<script lang="ts">
import type { PrimitiveProps } from '@/primitive';

export interface PaginationRootProps extends PrimitiveProps {
  total: number;
  pageSize?: number;
  siblingCount?: number;
  showEdges?: boolean;
  disabled?: boolean;
  defaultPage?: number;
}
</script>

<script setup lang="ts">
import { toRef } from 'vue';
import { useForwardExpose, useOffsetPagination } from '@robonen/vue';
import { Primitive } from '@/primitive';
import { providePaginationContext } from './context';

const {
  as = 'nav' as const,
  total,
  pageSize = 10,
  siblingCount = 1,
  showEdges = false,
  disabled = false,
  defaultPage = 1,
} = defineProps<PaginationRootProps>();

const page = defineModel<number>('page', { default: undefined });

if (page.value === undefined) {
  page.value = defaultPage;
}

defineSlots<{
  default?: (props: {
    page: number;
    pageCount: number;
  }) => any;
}>();

const { forwardRef } = useForwardExpose();

const {
  currentPage,
  totalPages,
  isFirstPage,
  isLastPage,
  next,
  previous,
  select,
} = useOffsetPagination({
  total: () => total,
  page,
  pageSize: toRef(() => pageSize),
});

function onPageChange(value: number) {
  page.value = value;
}

providePaginationContext({
  currentPage,
  totalPages,
  pageSize: toRef(() => pageSize),
  siblingCount: toRef(() => siblingCount),
  showEdges: toRef(() => showEdges),
  disabled: toRef(() => disabled),
  isFirstPage,
  isLastPage,
  onPageChange,
  next,
  prev: previous,
  select,
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as
  >
    <slot
      :page="page!"
      :page-count="totalPages"
    />
  </Primitive>
</template>
