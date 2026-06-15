import type { SwipeDirection } from './context';

export const VIEWPORT_PAUSE = 'toast.viewportPause';
export const VIEWPORT_RESUME = 'toast.viewportResume';

export const TOAST_SWIPE_START = 'toast.swipeStart';
export const TOAST_SWIPE_MOVE = 'toast.swipeMove';
export const TOAST_SWIPE_CANCEL = 'toast.swipeCancel';
export const TOAST_SWIPE_END = 'toast.swipeEnd';

/** Data attribute marking a subtree that should be skipped by the screen-reader announce harvester. */
export const ANNOUNCE_EXCLUDE_ATTR = 'data-primitives-toast-announce-exclude';
/** Data attribute carrying alternate text to announce in place of an excluded subtree. */
export const ANNOUNCE_ALT_ATTR = 'data-primitives-toast-announce-alt';

export interface SwipeEventDetail {
  originalEvent: PointerEvent;
  delta: { x: number; y: number };
}

export type SwipeEvent = { currentTarget: EventTarget & HTMLElement } & Omit<
  CustomEvent<SwipeEventDetail>,
  'currentTarget'
>;

/**
 * Dispatches a cancelable `CustomEvent` on the originating element and, when a
 * handler is supplied, attaches it once before dispatch so listeners can call
 * `preventDefault()`. Mirrors the dispatch pattern used by the focus-scope
 * helpers but specialised for the swipe gesture detail payload.
 */
export function handleAndDispatchCustomEvent(
  name: string,
  handler: ((event: SwipeEvent) => void) | undefined,
  detail: SwipeEventDetail,
) {
  const currentTarget = detail.originalEvent.currentTarget as HTMLElement;
  const event = new CustomEvent(name, {
    bubbles: false,
    cancelable: true,
    detail,
  });

  if (handler)
    currentTarget.addEventListener(name, handler as EventListener, { once: true });

  currentTarget.dispatchEvent(event);
}

/**
 * Whether a pointer delta is dominant along the swipe axis and past the
 * threshold. Horizontal directions compare `x`, vertical compare `y`.
 */
export function isDeltaInDirection(
  delta: { x: number; y: number },
  direction: SwipeDirection,
  threshold = 0,
): boolean {
  const deltaX = Math.abs(delta.x);
  const deltaY = Math.abs(delta.y);
  const isDeltaX = deltaX > deltaY;

  if (direction === 'left' || direction === 'right')
    return isDeltaX && deltaX > threshold;

  return !isDeltaX && deltaY > threshold;
}

function isHTMLElement(node: Node): node is HTMLElement {
  return node.nodeType === node.ELEMENT_NODE;
}

/**
 * Walks a toast element collecting its visible text as discrete chunks for a
 * screen-reader live region. Hidden subtrees (`aria-hidden`, `hidden`,
 * `display: none`) are skipped, and subtrees flagged with
 * `data-primitives-toast-announce-exclude` are replaced by their
 * `data-primitives-toast-announce-alt` text (if any).
 *
 * Returning an array (rather than a single joined string) lets the live region
 * render one text node per chunk, giving assistive tech a natural pause break
 * between the title and description.
 */
export function getAnnounceTextContent(container: HTMLElement): string[] {
  const textContent: string[] = [];

  for (const node of Array.from(container.childNodes)) {
    if (node.nodeType === node.TEXT_NODE && node.textContent)
      textContent.push(node.textContent);

    if (isHTMLElement(node)) {
      const isHidden = node.ariaHidden === 'true' || node.hidden || node.style.display === 'none';
      if (isHidden) continue;

      const isExcluded = node.getAttribute(ANNOUNCE_EXCLUDE_ATTR) === '';
      if (isExcluded) {
        const altText = node.getAttribute(ANNOUNCE_ALT_ATTR);
        if (altText) textContent.push(altText);
      }
      else {
        textContent.push(...getAnnounceTextContent(node));
      }
    }
  }

  return textContent;
}
