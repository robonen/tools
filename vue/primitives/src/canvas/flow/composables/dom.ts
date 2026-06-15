/**
 * `setPointerCapture` / `releasePointerCapture` throw when there is no live
 * pointer for the id — which happens for synthetic events in tests and for
 * pointers that were already released. These guards swallow only that case.
 */
export function capturePointer(el: HTMLElement | undefined, id: number): void {
  try {
    el?.setPointerCapture?.(id);
  }
  catch {
    /* no active pointer (synthetic event) */
  }
}

export function releasePointer(el: HTMLElement | undefined, id: number): void {
  try {
    el?.releasePointerCapture?.(id);
  }
  catch {
    /* pointer already released */
  }
}
