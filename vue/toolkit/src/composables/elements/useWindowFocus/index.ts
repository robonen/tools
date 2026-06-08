import { shallowRef } from 'vue';
import type { ShallowRef } from 'vue';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { useEventListener } from '@/composables/browser/useEventListener';

export interface UseWindowFocusOptions extends ConfigurableWindow {}

export type UseWindowFocusReturn = ShallowRef<boolean>;

/**
 * @name useWindowFocus
 * @category Elements
 * @description Reactively track whether the window is focused via `focus`/`blur` events.
 *
 * @param {UseWindowFocusOptions} [options={}] Options
 * @returns {UseWindowFocusReturn} A shallow ref that is `true` while the window has focus
 *
 * @example
 * const focused = useWindowFocus();
 *
 * @since 0.0.15
 */
export function useWindowFocus(options: UseWindowFocusOptions = {}): UseWindowFocusReturn {
  const { window = defaultWindow } = options;

  if (!window)
    return shallowRef(false);

  const focused = shallowRef(window.document.hasFocus());

  const listenerOptions = { passive: true } as const;

  useEventListener(window, 'blur', () => {
    focused.value = false;
  }, listenerOptions);

  useEventListener(window, 'focus', () => {
    focused.value = true;
  }, listenerOptions);

  return focused;
}
