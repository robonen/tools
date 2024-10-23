import type { VoidFunction } from '@robonen/stdlib';
import { computed, reactive, toValue, watch, type ComputedRef, type MaybeRef, type MaybeRefOrGetter, type UnwrapNestedRefs, type WritableComputedRef } from 'vue';
import { useClamp } from '../useClamp';

// TODO: sync returned refs with passed refs

export interface UseOffsetPaginationOptions {
  total?: MaybeRefOrGetter<number>;
  pageSize?: MaybeRef<number>;
  page?: MaybeRef<number>;
  onPageChange?: (returnValue: UnwrapNestedRefs<UseOffsetPaginationReturn>) => unknown;
  onPageSizeChange?: (returnValue: UnwrapNestedRefs<UseOffsetPaginationReturn>) => unknown;
  onTotalPagesChange?: (returnValue: UnwrapNestedRefs<UseOffsetPaginationReturn>) => unknown;
}

export interface UseOffsetPaginationReturn {
  currentPage: WritableComputedRef<number>;
  currentPageSize: WritableComputedRef<number>;
  totalPages: ComputedRef<number>;
  isFirstPage: ComputedRef<boolean>;
  isLastPage: ComputedRef<boolean>;
  next: VoidFunction;
  previous: VoidFunction;
  select: (page: number) => void;
}

export type UseOffsetPaginationInfinityReturn = Omit<UseOffsetPaginationReturn, 'isLastPage'>;

/**
 * @name useOffsetPagination
 * @category Utilities
 * @description A composable function that provides pagination functionality for offset based pagination
 * 
 * @param {UseOffsetPaginationOptions} options The options for the pagination
 * @param {MaybeRefOrGetter<number>} options.total The total number of items
 * @param {MaybeRef<number>} options.pageSize The number of items per page
 * @param {MaybeRef<number>} options.page The current page
 * @param {(returnValue: UnwrapNestedRefs<UseOffsetPaginationReturn>) => unknown} options.onPageChange A callback that is called when the page changes
 * @param {(returnValue: UnwrapNestedRefs<UseOffsetPaginationReturn>) => unknown} options.onPageSizeChange A callback that is called when the page size changes
 * @param {(returnValue: UnwrapNestedRefs<UseOffsetPaginationReturn>) => unknown} options.onTotalPagesChange A callback that is called when the total number of pages changes
 * @returns {UseOffsetPaginationReturn} The pagination object
 * 
 * @example
 * const {
 *  currentPage,
 *  currentPageSize,
 *  totalPages,
 *  isFirstPage,
 *  isLastPage,
 *  next,
 *  previous,
 *  select,
 * } = useOffsetPagination({ total: 100, pageSize: 10, page: 1 });
 * 
 * @example
 * const {
 *  currentPage,
 * } = useOffsetPagination({
 *  total: 100,
 *  pageSize: 10,
 *  page: 1,
 *  onPageChange: ({ currentPage }) => console.log(currentPage),
 *  onPageSizeChange: ({ currentPageSize }) => console.log(currentPageSize),
 *  onTotalPagesChange: ({ totalPages }) => console.log(totalPages),
 * });
 * 
 * @since 0.0.1
 */
export function useOffsetPagination(options: Omit<UseOffsetPaginationOptions, 'total'>): UseOffsetPaginationInfinityReturn;
export function useOffsetPagination(options: UseOffsetPaginationOptions): UseOffsetPaginationReturn;
export function useOffsetPagination(options: UseOffsetPaginationOptions): UseOffsetPaginationReturn {
  const {
    total = Number.POSITIVE_INFINITY,
    pageSize = 10,
    page = 1,
  } = options;

  const currentPageSize = useClamp(pageSize, 1, Number.POSITIVE_INFINITY);

  const totalPages = computed(() => Math.max(
    1,
    Math.ceil(toValue(total) / toValue(currentPageSize))
  ));

  const currentPage = useClamp(page, 1, totalPages);

  const isFirstPage = computed(() => currentPage.value === 1);
  const isLastPage = computed(() => currentPage.value === totalPages.value);

  const next = () => currentPage.value++;
  const previous = () => currentPage.value--;
  const select = (page: number) => currentPage.value = page;

  const returnValue = {
    currentPage,
    currentPageSize,
    totalPages,
    isFirstPage,
    isLastPage,
    next,
    previous,
    select,
  };

  // NOTE: Don't forget to await nextTick() after calling next() or previous() to ensure the callback is called

  if (options.onPageChange) {
    watch(currentPage, () => {
      options.onPageChange!(reactive(returnValue));
    });
  }

  if (options.onPageSizeChange) {
    watch(currentPageSize, () => {
      options.onPageSizeChange!(reactive(returnValue));
    });
  }

  if (options.onTotalPagesChange) {
    watch(totalPages, () => {
      options.onTotalPagesChange!(reactive(returnValue));
    });
  }

  return returnValue;
}
