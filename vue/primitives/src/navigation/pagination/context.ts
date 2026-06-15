import type { Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';

export interface PaginationContext {
  currentPage: Readonly<Ref<number>>;
  totalPages: Readonly<Ref<number>>;
  pageSize: Readonly<Ref<number>>;
  siblingCount: Readonly<Ref<number>>;
  showEdges: Readonly<Ref<boolean>>;
  disabled: Readonly<Ref<boolean>>;
  isFirstPage: Readonly<Ref<boolean>>;
  isLastPage: Readonly<Ref<boolean>>;
  onPageChange: (value: number) => void;
  next: () => void;
  prev: () => void;
  select: (page: number) => void;
}

export const PaginationCtx = useContextFactory<PaginationContext>('PaginationContext');

export const providePaginationContext = PaginationCtx.provide;
export const injectPaginationContext = PaginationCtx.inject;
