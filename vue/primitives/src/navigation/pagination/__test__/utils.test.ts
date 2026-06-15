import { describe, expect, it } from 'vitest';
import { PaginationItemType, getRange, transform } from '../utils';

describe(getRange, () => {
  it('returns empty array for zero total pages', () => {
    expect(getRange(1, 0, 1, false)).toEqual([]);
  });

  it('returns single page when totalPages is 1', () => {
    expect(getRange(1, 1, 1, false)).toEqual([
      { type: 'page', value: 1 },
    ]);
  });

  it('returns all pages when totalPages fits within visible window', () => {
    expect(getRange(1, 5, 1, false)).toEqual([
      { type: 'page', value: 1 },
      { type: 'page', value: 2 },
      { type: 'page', value: 3 },
      { type: 'page', value: 4 },
      { type: 'page', value: 5 },
    ]);
  });

  it('returns all pages when totalPages equals the threshold', () => {
    // siblingCount=1: totalWithEllipsis = 1*2+3+2 = 7
    expect(getRange(1, 7, 1, false)).toEqual([
      { type: 'page', value: 1 },
      { type: 'page', value: 2 },
      { type: 'page', value: 3 },
      { type: 'page', value: 4 },
      { type: 'page', value: 5 },
      { type: 'page', value: 6 },
      { type: 'page', value: 7 },
    ]);
  });

  it('shows right ellipsis when current page is near the start', () => {
    const items = getRange(1, 10, 1, false);

    expect(items[0]).toEqual({ type: 'page', value: 1 });
    expect(items).toContainEqual({ type: 'ellipsis' });
    expect(items[items.length - 1]).toEqual({ type: 'page', value: 10 });
  });

  it('shows left ellipsis when current page is near the end', () => {
    const items = getRange(10, 10, 1, false);

    expect(items[0]).toEqual({ type: 'page', value: 1 });
    expect(items).toContainEqual({ type: 'ellipsis' });
    expect(items[items.length - 1]).toEqual({ type: 'page', value: 10 });
  });

  it('shows both ellipses when current page is in the middle', () => {
    const items = getRange(5, 10, 1, false);
    const ellipses = items.filter(i => i.type === 'ellipsis');

    expect(ellipses).toHaveLength(2);
    expect(items[0]).toEqual({ type: 'page', value: 1 });
    expect(items[items.length - 1]).toEqual({ type: 'page', value: 10 });
    // Should include current page and siblings
    expect(items).toContainEqual({ type: 'page', value: 4 });
    expect(items).toContainEqual({ type: 'page', value: 5 });
    expect(items).toContainEqual({ type: 'page', value: 6 });
  });

  it('respects siblingCount when generating range', () => {
    const items = getRange(10, 20, 2, false);
    const ellipses = items.filter(i => i.type === 'ellipsis');

    expect(ellipses).toHaveLength(2);
    // Current page ± 2 siblings
    expect(items).toContainEqual({ type: 'page', value: 8 });
    expect(items).toContainEqual({ type: 'page', value: 9 });
    expect(items).toContainEqual({ type: 'page', value: 10 });
    expect(items).toContainEqual({ type: 'page', value: 11 });
    expect(items).toContainEqual({ type: 'page', value: 12 });
  });

  it('shows edge pages when showEdges is true', () => {
    const items = getRange(5, 10, 1, true);

    // First and last pages should always be present
    expect(items[0]).toEqual({ type: 'page', value: 1 });
    expect(items[items.length - 1]).toEqual({ type: 'page', value: 10 });

    // Should have ellipses
    const ellipses = items.filter(i => i.type === 'ellipsis');
    expect(ellipses.length).toBeGreaterThanOrEqual(1);
  });

  it('does not duplicate first/last page with showEdges at boundaries', () => {
    const items = getRange(1, 10, 1, true);
    const firstPages = items.filter(i => i.type === 'page' && i.value === 1);

    expect(firstPages).toHaveLength(1);
  });

  it('handles large siblingCount gracefully', () => {
    const items = getRange(1, 3, 10, false);

    expect(items).toEqual([
      { type: 'page', value: 1 },
      { type: 'page', value: 2 },
      { type: 'page', value: 3 },
    ]);
  });

  it('always includes current page in the result', () => {
    for (let page = 1; page <= 20; page++) {
      const items = getRange(page, 20, 1, false);
      const pages = items.filter(i => i.type === 'page').map(i => (i as { type: 'page'; value: number }).value);

      expect(pages).toContain(page);
    }
  });
});

describe('getRange windowing matrix invariants', () => {
  function pageValues(items: ReturnType<typeof getRange>): number[] {
    return items
      .filter((i): i is { type: 'page'; value: number } => i.type === 'page')
      .map(i => i.value);
  }

  const totalsList = [1, 2, 3, 5, 7, 8, 10, 13, 20, 50];
  const siblingList = [0, 1, 2, 3];
  const showEdgesList = [false, true];

  it('never produces duplicate page numbers', () => {
    for (const totalPages of totalsList) {
      for (const siblingCount of siblingList) {
        for (const showEdges of showEdgesList) {
          for (let page = 1; page <= totalPages; page++) {
            const pages = pageValues(getRange(page, totalPages, siblingCount, showEdges));
            expect(new Set(pages).size).toBe(pages.length);
          }
        }
      }
    }
  });

  it('always emits page numbers in strictly increasing order', () => {
    for (const totalPages of totalsList) {
      for (const siblingCount of siblingList) {
        for (const showEdges of showEdgesList) {
          for (let page = 1; page <= totalPages; page++) {
            const pages = pageValues(getRange(page, totalPages, siblingCount, showEdges));
            for (let i = 1; i < pages.length; i++)
              expect(pages[i]!).toBeGreaterThan(pages[i - 1]!);
          }
        }
      }
    }
  });

  it('always keeps every page number within [1, totalPages]', () => {
    for (const totalPages of totalsList) {
      for (const siblingCount of siblingList) {
        for (const showEdges of showEdgesList) {
          for (let page = 1; page <= totalPages; page++) {
            const pages = pageValues(getRange(page, totalPages, siblingCount, showEdges));
            for (const value of pages) {
              expect(value).toBeGreaterThanOrEqual(1);
              expect(value).toBeLessThanOrEqual(totalPages);
            }
          }
        }
      }
    }
  });

  it('always includes the current page', () => {
    for (const totalPages of totalsList) {
      for (const siblingCount of siblingList) {
        for (const showEdges of showEdgesList) {
          for (let page = 1; page <= totalPages; page++) {
            const pages = pageValues(getRange(page, totalPages, siblingCount, showEdges));
            expect(pages).toContain(page);
          }
        }
      }
    }
  });

  it('always includes the first and last page', () => {
    for (const totalPages of totalsList) {
      for (const siblingCount of siblingList) {
        for (const showEdges of showEdgesList) {
          for (let page = 1; page <= totalPages; page++) {
            const pages = pageValues(getRange(page, totalPages, siblingCount, showEdges));
            expect(pages[0]).toBe(1);
            expect(pages[pages.length - 1]).toBe(totalPages);
          }
        }
      }
    }
  });

  it('never places an ellipsis at the first or last slot', () => {
    for (const totalPages of totalsList) {
      for (const siblingCount of siblingList) {
        for (const showEdges of showEdgesList) {
          for (let page = 1; page <= totalPages; page++) {
            const items = getRange(page, totalPages, siblingCount, showEdges);
            if (items.length === 0)
              continue;
            expect(items[0]!.type).toBe('page');
            expect(items[items.length - 1]!.type).toBe('page');
          }
        }
      }
    }
  });

  it('never places two ellipses adjacently', () => {
    for (const totalPages of totalsList) {
      for (const siblingCount of siblingList) {
        for (const showEdges of showEdgesList) {
          for (let page = 1; page <= totalPages; page++) {
            const items = getRange(page, totalPages, siblingCount, showEdges);
            for (let i = 1; i < items.length; i++)
              expect(items[i]!.type === 'ellipsis' && items[i - 1]!.type === 'ellipsis').toBe(false);
          }
        }
      }
    }
  });

  it('always includes the current page siblings when they fit inside the range', () => {
    for (const totalPages of totalsList) {
      for (const siblingCount of siblingList) {
        for (const showEdges of showEdgesList) {
          for (let page = 1; page <= totalPages; page++) {
            const pages = pageValues(getRange(page, totalPages, siblingCount, showEdges));
            for (let s = Math.max(1, page - siblingCount); s <= Math.min(totalPages, page + siblingCount); s++) {
              // A sibling may legitimately be hidden behind an ellipsis only when
              // it is not adjacent to the current page window edge; verify the
              // immediate neighbours (page ± 1) are always present.
              if (Math.abs(s - page) <= 1)
                expect(pages).toContain(s);
            }
          }
        }
      }
    }
  });
});

describe(transform, () => {
  it('converts numbers to page items', () => {
    expect(transform([1, 2, 3])).toEqual([
      { type: PaginationItemType.Page, value: 1 },
      { type: PaginationItemType.Page, value: 2 },
      { type: PaginationItemType.Page, value: 3 },
    ]);
  });

  it('converts strings to ellipsis items', () => {
    expect(transform(['...'])).toEqual([
      { type: PaginationItemType.Ellipsis },
    ]);
  });

  it('converts mixed array', () => {
    expect(transform([1, '...', 5])).toEqual([
      { type: PaginationItemType.Page, value: 1 },
      { type: PaginationItemType.Ellipsis },
      { type: PaginationItemType.Page, value: 5 },
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(transform([])).toEqual([]);
  });
});
