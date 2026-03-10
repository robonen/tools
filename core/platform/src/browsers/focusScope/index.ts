export type FocusableTarget = HTMLElement | { focus: () => void };

export const AUTOFOCUS_ON_MOUNT = 'focusScope.autoFocusOnMount';
export const AUTOFOCUS_ON_UNMOUNT = 'focusScope.autoFocusOnUnmount';
export const EVENT_OPTIONS = { bubbles: false, cancelable: true };

/**
 * @name getActiveElement
 * @category Browsers
 * @description Returns the active element of the document (or shadow root)
 *
 * @since 0.0.5
 */
export function getActiveElement(doc: Document | ShadowRoot = document): HTMLElement | null {
  let active = doc.activeElement as HTMLElement | null;

  while (active?.shadowRoot)
    active = active.shadowRoot.activeElement as HTMLElement | null;

  return active;
}

/**
 * @name isSelectableInput
 * @category Browsers
 * @description Checks if an element is an input element with a select method
 *
 * @since 0.0.5
 */
export function isSelectableInput(element: unknown): element is FocusableTarget & { select: () => void } {
  return element instanceof HTMLInputElement && 'select' in element;
}

/**
 * @name focus
 * @category Browsers
 * @description Focuses an element without scrolling. Optionally calls select on input elements.
 *
 * @since 0.0.5
 */
export function focus(element?: FocusableTarget | null, { select = false } = {}) {
  if (element && element.focus) {
    const previouslyFocused = getActiveElement();

    element.focus({ preventScroll: true });

    if (element !== previouslyFocused && isSelectableInput(element) && select) {
      element.select();
    }
  }
}

/**
 * @name focusFirst
 * @category Browsers
 * @description Attempts to focus the first element from a list of candidates. Stops when focus actually moves.
 *
 * @since 0.0.5
 */
export function focusFirst(candidates: HTMLElement[], { select = false } = {}): boolean {
  const previouslyFocused = getActiveElement();

  for (const candidate of candidates) {
    focus(candidate, { select });

    if (getActiveElement() !== previouslyFocused)
      return true;
  }

  return false;
}

/**
 * @name getTabbableCandidates
 * @category Browsers
 * @description Collects all tabbable candidates via TreeWalker (faster than querySelectorAll).
 * This is an approximate check — does not account for computed styles. Visibility is checked separately in `findFirstVisible`.
 *
 * @since 0.0.5
 */
export function getTabbableCandidates(container: HTMLElement): HTMLElement[] {
  const nodes: HTMLElement[] = [];

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node: HTMLElement) => {
      const isHiddenInput = node.tagName === 'INPUT' && (node as HTMLInputElement).type === 'hidden';

      if ((node as any).disabled || node.hidden || isHiddenInput)
        return NodeFilter.FILTER_SKIP;

      return node.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });

  while (walker.nextNode())
    nodes.push(walker.currentNode as HTMLElement);

  return nodes;
}

/**
 * @name isHidden
 * @category Browsers
 * @description Checks if an element is hidden via `visibility: hidden` or `display: none` up the DOM tree
 *
 * @since 0.0.5
 */
export function isHidden(node: HTMLElement, upTo?: HTMLElement): boolean {
  const style = getComputedStyle(node);

  if (style.visibility === 'hidden' || style.display === 'none')
    return true;

  while (node.parentElement) {
    node = node.parentElement;

    if (upTo !== undefined && node === upTo)
      return false;

    if (getComputedStyle(node).display === 'none')
      return true;
  }

  return false;
}

/**
 * @name findFirstVisible
 * @category Browsers
 * @description Returns the first visible element from a list. Checks visibility up the DOM to `container` (exclusive).
 *
 * @since 0.0.5
 */
export function findFirstVisible(elements: HTMLElement[], container: HTMLElement): HTMLElement | undefined {
  for (const element of elements) {
    if (!isHidden(element, container))
      return element;
  }
}

/**
 * @name findLastVisible
 * @category Browsers
 * @description Returns the last visible element from a list. Checks visibility up the DOM to `container` (exclusive).
 *
 * @since 0.0.5
 */
export function findLastVisible(elements: HTMLElement[], container: HTMLElement): HTMLElement | undefined {
  for (let i = elements.length - 1; i >= 0; i--) {
    if (!isHidden(elements[i]!, container))
      return elements[i];
  }
}

/**
 * @name getTabbableEdges
 * @category Browsers
 * @description Returns the first and last tabbable elements inside a container
 *
 * @since 0.0.5
 */
export function getTabbableEdges(container: HTMLElement): { first: HTMLElement | undefined; last: HTMLElement | undefined } {
  const candidates = getTabbableCandidates(container);
  const first = findFirstVisible(candidates, container);
  const last = findLastVisible(candidates, container);

  return { first, last };
}
