import type { CheckedState } from './types';

import { getActiveElement } from '@robonen/platform/browsers';

export const ITEM_SELECT = 'menu.itemSelect';
export const SELECTION_KEYS = ['Enter', ' '];
export const FIRST_KEYS = ['ArrowDown', 'PageUp', 'Home'];
export const LAST_KEYS = ['ArrowUp', 'PageDown', 'End'];
export const FIRST_LAST_KEYS = [...FIRST_KEYS, ...LAST_KEYS];
export const SUB_OPEN_KEYS: Record<string, string[]> = {
  ltr: [...SELECTION_KEYS, 'ArrowRight'],
  rtl: [...SELECTION_KEYS, 'ArrowLeft'],
};
export const SUB_CLOSE_KEYS: Record<string, string[]> = {
  ltr: ['ArrowLeft'],
  rtl: ['ArrowRight'],
};

export function getOpenState(open: boolean): 'open' | 'closed' {
  return open ? 'open' : 'closed';
}

export function isIndeterminate(checked: CheckedState): checked is 'indeterminate' {
  return checked === 'indeterminate';
}

export function getCheckedState(checked: CheckedState): 'checked' | 'unchecked' | 'indeterminate' {
  if (isIndeterminate(checked)) return 'indeterminate';
  return checked ? 'checked' : 'unchecked';
}

export function focusFirst(candidates: HTMLElement[]): void {
  for (const candidate of candidates) {
    const prev = getActiveElement();
    candidate.focus({ preventScroll: true });
    if (getActiveElement() !== prev) return;
  }
}

export function getNextMatch(
  items: HTMLElement[],
  search: string,
  currentItem?: HTMLElement | null,
): HTMLElement | undefined {
  const isRepeating = search.length > 1 && Array.from(search).every(c => c === search[0]);
  const normalizedSearch = isRepeating ? search[0]! : search;

  const currentIndex = currentItem ? items.indexOf(currentItem) : -1;
  const wrappedItems = currentIndex !== -1
    ? [...items.slice(currentIndex + 1), ...items.slice(0, currentIndex + 1)]
    : items;

  const getText = (el: HTMLElement) =>
    el.dataset['primitiveMenuItemTextValue'] ?? el.textContent?.trim() ?? '';

  return wrappedItems.find(item =>
    getText(item).toLowerCase().startsWith(normalizedSearch.toLowerCase()),
  );
}

export interface Point { x: number; y: number };
export type Polygon = Point[];
export type Side = 'left' | 'right';
export interface GraceIntent { area: Polygon; side: Side }

export function isPointInPolygon(point: Point, polygon: Polygon): boolean {
  const { x, y } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i]!.x;
    const yi = polygon[i]!.y;
    const xj = polygon[j]!.x;
    const yj = polygon[j]!.y;
    const intersects = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function isPointerInGraceArea(event: PointerEvent, area: Polygon): boolean {
  return isPointInPolygon({ x: event.clientX, y: event.clientY }, area);
}

export function isMouseEvent(event: Event): event is MouseEvent {
  return ['mousedown', 'mouseup', 'mousemove', 'click'].includes(event.type);
}
