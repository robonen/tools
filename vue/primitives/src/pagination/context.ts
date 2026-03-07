import type { ComputedRef, Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';

export interface PaginationContext {
  currentPage: Ref<number>;
  totalPages: ComputedRef<number>;
  pageSize: Ref<number>;
  siblingCount: Ref<number>;
  showEdges: Ref<boolean>;
  disabled: Ref<boolean>;
  isFirstPage: ComputedRef<boolean>;
  isLastPage: ComputedRef<boolean>;
  onPageChange: (value: number) => void;
  next: () => void;
  prev: () => void;
  select: (page: number) => void;
}

export const PaginationCtx = useContextFactory<PaginationContext>('PaginationContext');

export const providePaginationContext = PaginationCtx.provide;
export const injectPaginationContext = PaginationCtx.inject;
