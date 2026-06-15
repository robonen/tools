import type { CheckedState } from './types';

import { getActiveElement } from '@robonen/platform/browsers';
import { isPointInPolygon } from '../../internal/utils/geometry';

/** Any serialisable value a radio item can carry (not just strings). */
export type AcceptableValue = string | number | boolean | Record<string, unknown>;

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

export function isPointerInGraceArea(event: PointerEvent, area?: Polygon | null): boolean {
  if (!area) return false;
  return isPointInPolygon({ x: event.clientX, y: event.clientY }, area);
}

export function isMouseEvent(event: Event): event is MouseEvent {
  return ['mousedown', 'mouseup', 'mousemove', 'click'].includes(event.type);
}

/**
 * Whether a pointer event came from a real mouse (not pen / touch). Hover-only
 * menu behaviour (open-on-hover, highlight-on-move, grace area) must ignore pen
 * and touch so taps don't trigger hover semantics.
 */
export function isMousePointer(event: PointerEvent): boolean {
  return event.pointerType === 'mouse';
}

/**
 * Builds the 5-point "grace area" polygon that lets the pointer travel
 * diagonally from a sub-trigger toward its already-open submenu without the
 * submenu closing. The polygon spans from the pointer exit point to the two
 * vertical edges of the submenu content on the side it opened to.
 */
export function buildSubmenuGraceArea(event: PointerEvent, contentRect: DOMRect, side: Side): Polygon {
  const rightSide = side === 'right';
  const bleed = rightSide ? -5 : 5;
  const contentNearEdge = contentRect[rightSide ? 'left' : 'right'];
  const contentFarEdge = contentRect[rightSide ? 'right' : 'left'];
  return [
    { x: event.clientX + bleed, y: event.clientY },
    { x: contentNearEdge, y: contentRect.top },
    { x: contentFarEdge, y: contentRect.top },
    { x: contentFarEdge, y: contentRect.bottom },
    { x: contentNearEdge, y: contentRect.bottom },
  ];
}
