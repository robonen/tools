import { describe, it, expect } from 'vitest';
import { getRange, transform, PaginationItemType } from '../utils';

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
