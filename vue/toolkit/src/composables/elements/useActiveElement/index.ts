import { shallowRef } from 'vue';
import type { ShallowRef } from 'vue';
import { defaultWindow } from '@/types';
import type { ConfigurableDocument, ConfigurableWindow } from '@/types';
import { useEventListener } from '@/composables/browser/useEventListener';
import { useMutationObserver } from '@/composables/elements/useMutationObserver';

export interface UseActiveElementOptions extends ConfigurableWindow, ConfigurableDocument {
  /**
   * Search for the active element inside open shadow roots
   *
   * @default true
   */
  deep?: boolean;
  /**
   * Re-evaluate the active element when it is removed from the DOM.
   * Uses a `MutationObserver` under the hood, so it is only enabled on demand.
   *
   * @default false
   */
  triggerOnRemoval?: boolean;
}

export type UseActiveElementReturn<T extends HTMLElement = HTMLElement> = ShallowRef<T | null | undefined>;

/**
 * @name useActiveElement
 * @category Elements
 * @description Reactive `document.activeElement`, traversing open shadow roots.
 *
 * @param {UseActiveElementOptions} [options={}] Options
 * @returns {UseActiveElementReturn<T>} The currently focused element
 *
 * @example
 * const active = useActiveElement();
 *
 * @example
 * // keep tracking even if the focused node is detached from the DOM
 * const active = useActiveElement({ triggerOnRemoval: true });
 *
 * @since 0.0.15
 */
export function useActiveElement<T extends HTMLElement>(
  options: UseActiveElementOptions = {},
): UseActiveElementReturn<T> {
  const {
    window = defaultWindow,
    deep = true,
    triggerOnRemoval = false,
  } = options;

  const document = options.document ?? window?.document;

  const getDeepActiveElement = (): Element | null | undefined => {
    let element = document?.activeElement;

    if (deep) {
      while (element?.shadowRoot)
        element = element.shadowRoot.activeElement;
    }

    return element;
  };

  const activeElement = shallowRef<T | null | undefined>();

  const trigger = (): void => {
    activeElement.value = getDeepActiveElement() as T | null | undefined;
  };

  if (window) {
    const listenerOptions = { capture: true, passive: true } as const;

    // `focus` (capture) catches focus moving onto any element, including those
    // inside open shadow roots; `blur` with no `relatedTarget` resets the ref
    // when focus leaves the document/window entirely.
    useEventListener(
      window,
      'blur',
      (event: FocusEvent) => {
        if (event.relatedTarget !== null)
          return;

        trigger();
      },
      listenerOptions,
    );
    useEventListener(window, 'focus', trigger, listenerOptions);
  }

  if (triggerOnRemoval && document) {
    useMutationObserver(
      () => [document.body],
      (mutations) => {
        for (const mutation of mutations) {
          for (const removed of mutation.removedNodes) {
            if (removed === activeElement.value || removed.contains(activeElement.value as Node)) {
              trigger();
              return;
            }
          }
        }
      },
      { window, childList: true, subtree: true },
    );
  }

  trigger();

  return activeElement;
}
