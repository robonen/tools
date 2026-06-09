<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * Splits a large collection into discrete pages and lets users move between
 * them. Use it for paged tables, search results, or any list too long to show
 * at once — pair it with server- or client-side data fetching keyed off the
 * current page.
 *
 * The root owns the current page (controlled via `v-model:page` or uncontrolled
 * via `defaultPage`), derives the total page count from `total` and `pageSize`,
 * and provides context to every child part (list, items, ellipsis, and the
 * first/prev/next/last controls). The default slot exposes `page` and
 * `pageCount`.
 */
export interface PaginationRootProps extends PrimitiveProps {
  /** Total number of items across all pages. */
  total: number;

  /** Number of items per page; combined with `total` to derive the page count. @default 10 */
  pageSize?: number;

  /** Number of page links to show on each side of the current page. @default 1 */
  siblingCount?: number;

  /** Always render the first and last page links, even when ellipses are shown. @default false */
  showEdges?: boolean;

  /** Disable the whole pagination, including every control. @default false */
  disabled?: boolean;

  /** Initial page for uncontrolled usage (when `v-model:page` is not bound). @default 1 */
  defaultPage?: number;
}
</script>

<script setup lang="ts">
import { useForwardExpose, useOffsetPagination } from '@robonen/vue';
import { Primitive } from '../primitive';
import { providePaginationContext } from './context';
import { toRef } from 'vue';

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
