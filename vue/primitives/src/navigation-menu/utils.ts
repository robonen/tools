/**
 * Returns the open state string for the current item value vs the active menu value.
 */
export function getOpenState(value: string, itemValue: string): 'open' | 'closed' {
  return value === itemValue ? 'open' : 'closed';
}

export function makeTriggerId(baseId: string, value: string): string {
  return `${baseId}-trigger-${value}`;
}

export function makeContentId(baseId: string, value: string): string {
  return `${baseId}-content-${value}`;
}

/** Only call `handler` when the pointer device is a mouse. */
export function whenMouse<E extends PointerEvent>(handler: (event: E) => void): (event: E) => void {
  return (event: E) => {
    if (event.pointerType === 'mouse') handler(event);
  };
}

/**
 * Temporarily removes elements from the tab order while content is closed, returning
 * a restore function. Used so background content keeps its tabindex when re-opened.
 */
export function removeFromTabOrder(candidates: HTMLElement[]): () => void {
  for (const c of candidates) {
    c.dataset['tabindex'] = c.getAttribute('tabindex') ?? '';
    c.setAttribute('tabindex', '-1');
  }
  return () => {
    for (const c of candidates) {
      const prev = c.dataset['tabindex'] ?? '';
      if (prev === '') c.removeAttribute('tabindex');
      else c.setAttribute('tabindex', prev);
    }
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Selector identifying the link/item nodes for arrow navigation inside content. */
export const COLLECTION_ITEM_ATTR = 'data-primitives-collection-item';

/** Custom event dispatched by a `NavigationMenuLink` selection. */
export const LINK_SELECT_EVENT = 'navigationMenu.linkSelect';
/** Custom event bubbled to the root content when an item dismisses the menu. */
export const EVENT_ROOT_CONTENT_DISMISS = 'navigationMenu.rootContentDismiss';
