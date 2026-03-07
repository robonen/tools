export enum PaginationItemType {
  Page = 'page',
  Ellipsis = 'ellipsis',
}

export type PaginationItem
  = | { type: 'page'; value: number }
    | { type: 'ellipsis' };

export type Pages = PaginationItem[];

export function transform(items: Array<string | number>): Pages {
  return items.map((value) => {
    if (typeof value === 'number')
      return { type: PaginationItemType.Page, value };
    return { type: PaginationItemType.Ellipsis };
  });
}

const ELLIPSIS: PaginationItem = { type: 'ellipsis' };

function page(value: number): PaginationItem {
  return { type: 'page', value };
}

function range(start: number, end: number): PaginationItem[] {
  const items: PaginationItem[] = [];

  for (let i = start; i <= end; i++)
    items.push(page(i));

  return items;
}

export function getRange(
  currentPage: number,
  totalPages: number,
  siblingCount: number,
  showEdges: boolean,
): PaginationItem[] {
  if (totalPages <= 0)
    return [];

  // If total pages fit within the visible window, show all pages
  const totalVisible = siblingCount * 2 + 3; // siblings + current + 2 edges
  const totalWithEllipsis = totalVisible + 2; // + 2 ellipsis slots

  if (totalPages <= totalWithEllipsis)
    return range(1, totalPages);

  const leftSiblingStart = Math.max(currentPage - siblingCount, 1);
  const rightSiblingEnd = Math.min(currentPage + siblingCount, totalPages);

  const leftEdgeOffset = showEdges ? 1 : 0;
  const showLeftEllipsis = leftSiblingStart > 2 + leftEdgeOffset;
  const showRightEllipsis = rightSiblingEnd < totalPages - 1 - leftEdgeOffset;

  const items: PaginationItem[] = [];

  // Always show first page (either as edge or as part of the sequence)
  items.push(page(1));

  if (showLeftEllipsis) {
    items.push(ELLIPSIS);
  }
  else {
    // Show all pages from 2 to leftSiblingStart - 1
    for (let i = 2; i < leftSiblingStart; i++)
      items.push(page(i));
  }

  // Sibling pages including current (skip 1 since already added)
  for (let i = Math.max(leftSiblingStart, 2); i <= Math.min(rightSiblingEnd, totalPages - 1); i++)
    items.push(page(i));

  if (showRightEllipsis) {
    items.push(ELLIPSIS);
  }
  else {
    // Show all pages from rightSiblingEnd + 1 to totalPages - 1
    for (let i = rightSiblingEnd + 1; i < totalPages; i++)
      items.push(page(i));
  }

  // Always show last page (if more than 1 page)
  if (totalPages > 1)
    items.push(page(totalPages));

  return items;
}
