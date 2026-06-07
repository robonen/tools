import { shallowRef } from 'vue';
import type { ShallowRef } from 'vue';
import { defaultDocument } from '@/types';
import type { ConfigurableDocument } from '@/types';
import { useEventListener } from '@/composables/browser/useEventListener';

export interface UseDocumentVisibilityOptions extends ConfigurableDocument {
  /**
   * Called whenever `document.visibilityState` changes, receiving the new state,
   * the previous state, and the originating `visibilitychange` event.
   *
   * @default undefined
   */
  onChange?: (
    state: DocumentVisibilityState,
    previous: DocumentVisibilityState,
    event: Event,
  ) => void;
}

export type UseDocumentVisibilityReturn = ShallowRef<DocumentVisibilityState>;

/**
 * @name useDocumentVisibility
 * @category Browser
 * @description Reactive `document.visibilityState`.
 *
 * @param {UseDocumentVisibilityOptions} [options={}] Options (custom `document`, `onChange` callback)
 * @returns {UseDocumentVisibilityReturn} The current visibility state
 *
 * @example
 * const visibility = useDocumentVisibility();
 * watch(visibility, (state) => {
 *   if (state === 'visible') refresh();
 * });
 *
 * @example
 * useDocumentVisibility({
 *   onChange: (state) => {
 *     if (state === 'hidden') pausePlayback();
 *   },
 * });
 *
 * @since 0.0.15
 */
export function useDocumentVisibility(
  options: UseDocumentVisibilityOptions = {},
): UseDocumentVisibilityReturn {
  const { document = defaultDocument, onChange } = options;

  const visibility = shallowRef<DocumentVisibilityState>(document?.visibilityState ?? 'visible');

  if (document) {
    useEventListener(document, 'visibilitychange', (event) => {
      const previous = visibility.value;
      const state = document.visibilityState;

      if (state === previous)
        return;

      visibility.value = state;
      onChange?.(state, previous, event);
    }, { passive: true });
  }

  return visibility;
}
