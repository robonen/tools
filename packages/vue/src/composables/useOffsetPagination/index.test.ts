import { describe, it, expect, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { useOffsetPagination } from '.';

describe('useOffsetPagination', () => {
  it('initialize with default values without options', () => {
    const { currentPage, currentPageSize, totalPages, isFirstPage } = useOffsetPagination({});
    
    expect(currentPage.value).toBe(1);
    expect(currentPageSize.value).toBe(10);
    expect(totalPages.value).toBe(Infinity);
    expect(isFirstPage.value).toBe(true);
  });

  it('calculate total pages correctly', () => {
    const { totalPages } = useOffsetPagination({ total: 100, pageSize: 10 });
    
    expect(totalPages.value).toBe(10);
  });

  it('update current page correctly', () => {
    const { currentPage, next, previous, select } = useOffsetPagination({ total: 100, pageSize: 10 });
  
    next();
    expect(currentPage.value).toBe(2);
    
    previous();
    expect(currentPage.value).toBe(1);
    
    select(5);
    expect(currentPage.value).toBe(5);
  });

  it('handle out of bounds increments correctly', () => {
    const { currentPage, next, previous } = useOffsetPagination({ total: 10, pageSize: 5 });
    
    next();
    next();
    next();
    
    expect(currentPage.value).toBe(2);
    
    previous();
    previous();
    previous();
    
    expect(currentPage.value).toBe(1);
  });

  it('handle page boundaries correctly', () => {
    const { currentPage, isFirstPage, isLastPage } = useOffsetPagination({ total: 20, pageSize: 10 });
    
    expect(currentPage.value).toBe(1);
    expect(isFirstPage.value).toBe(true);
    expect(isLastPage.value).toBe(false);

    currentPage.value = 2;

    expect(currentPage.value).toBe(2);
    expect(isFirstPage.value).toBe(false);
    expect(isLastPage.value).toBe(true);
  });

  it('call onPageChange callback', async () => {
    const onPageChange = vi.fn();
    const { currentPage, next } = useOffsetPagination({ total: 100, pageSize: 10, onPageChange });
    
    next();
    await nextTick();
    
    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledWith(expect.objectContaining({ currentPage: currentPage.value }));
  });

  it('call onPageSizeChange callback', async () => {
    const onPageSizeChange = vi.fn();
    const pageSize = ref(10);
    const { currentPageSize } = useOffsetPagination({  total: 100, pageSize, onPageSizeChange });
    
    pageSize.value = 20;
    await nextTick();

    expect(onPageSizeChange).toHaveBeenCalledTimes(1);
    expect(onPageSizeChange).toHaveBeenCalledWith(expect.objectContaining({ currentPageSize: currentPageSize.value }));
  });

  it('call onPageCountChange callback', async () => {
    const onTotalPagesChange = vi.fn();
    const total = ref(100);
    const { totalPages } = useOffsetPagination({ total, pageSize: 10, onTotalPagesChange });
    
    total.value = 200;
    await nextTick();

    expect(onTotalPagesChange).toHaveBeenCalledTimes(1);
    expect(onTotalPagesChange).toHaveBeenCalledWith(expect.objectContaining({ totalPages: totalPages.value }));
  });

  it('handle complex reactive options', async () => {
    const total = ref(100);
    const pageSize = ref(10);
    const page = ref(1);

    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    const onTotalPagesChange = vi.fn();

    const { currentPage, currentPageSize, totalPages } = useOffsetPagination({
      total,
      pageSize,
      page,
      onPageChange,
      onPageSizeChange,
      onTotalPagesChange,
    });
    
    // Initial values
    expect(currentPage.value).toBe(1);
    expect(currentPageSize.value).toBe(10);
    expect(totalPages.value).toBe(10);
    expect(onPageChange).toHaveBeenCalledTimes(0);
    expect(onPageSizeChange).toHaveBeenCalledTimes(0);
    expect(onTotalPagesChange).toHaveBeenCalledTimes(0);
    
    total.value = 300;
    pageSize.value = 15;
    page.value = 2;
    await nextTick();
    
    // Valid values after changes
    expect(currentPage.value).toBe(2);
    expect(currentPageSize.value).toBe(15);
    expect(totalPages.value).toBe(20);
    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageSizeChange).toHaveBeenCalledTimes(1);
    expect(onTotalPagesChange).toHaveBeenCalledTimes(1);

    page.value = 21;
    await nextTick();

    // Invalid values after changes
    expect(currentPage.value).toBe(20);
    expect(onPageChange).toHaveBeenCalledTimes(2);
    expect(onPageSizeChange).toHaveBeenCalledTimes(1);
    expect(onTotalPagesChange).toHaveBeenCalledTimes(1);
  });
});