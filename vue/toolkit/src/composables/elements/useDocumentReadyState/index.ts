import { shallowRef } from 'vue';
import type { ShallowRef } from 'vue';
import { defaultDocument } from '@/types';
import type { ConfigurableDocument } from '@/types';
import { useEventListener } from '@/composables/browser/useEventListener';

export interface UseDocumentReadyStateOptions extends ConfigurableDocument {
  /**
   * Called whenever `document.readyState` changes, receiving the new state,
   * the previous state, and the originating `readystatechange` event.
   *
   * @default undefined
   */
  onChange?: (
    state: DocumentReadyState,
    previous: DocumentReadyState,
    event: Event,
  ) => void;
}

export type UseDocumentReadyStateReturn = ShallowRef<DocumentReadyState>;

/**
 * @name useDocumentReadyState
 * @category Elements
 * @description Reactive `document.readyState` (`loading` | `interactive` | `complete`), updated on `readystatechange`.
 *
 * @param {UseDocumentReadyStateOptions} [options={}] Options (custom `document`, `onChange` callback)
 * @returns {UseDocumentReadyStateReturn} The current document ready state
 *
 * @example
 * const readyState = useDocumentReadyState();
 * watch(readyState, (state) => {
 *   if (state === 'complete') runAfterLoad();
 * });
 *
 * @example
 * useDocumentReadyState({
 *   onChange: (state) => {
 *     if (state === 'interactive') hydrate();
 *   },
 * });
 *
 * @since 0.0.15
 */
export function useDocumentReadyState(
  options: UseDocumentReadyStateOptions = {},
): UseDocumentReadyStateReturn {
  const { document = defaultDocument, onChange } = options;

  const readyState = shallowRef<DocumentReadyState>(document?.readyState ?? 'loading');

  if (document) {
    useEventListener(document, 'readystatechange', (event) => {
      const previous = readyState.value;
      const state = document.readyState;

      if (state === previous)
        return;

      readyState.value = state;
      onChange?.(state, previous, event);
    }, { passive: true });
  }

  return readyState;
}
