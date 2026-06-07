import { shallowRef } from 'vue';
import type { ShallowRef } from 'vue';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { useEventListener } from '@/composables/browser/useEventListener';

export interface UsePageLeaveOptions extends ConfigurableWindow {
  /**
   * Called whenever the leave state flips, receiving the new value and the
   * originating mouse event.
   *
   * @default undefined
   */
  onChange?: (isLeft: boolean, event: MouseEvent) => void;
}

export type UsePageLeaveReturn = ShallowRef<boolean>;

/**
 * @name usePageLeave
 * @category Browser
 * @description Reactive flag indicating whether the mouse has left the page.
 *
 * @param {UsePageLeaveOptions} [options={}] Options (custom `window`, `onChange` callback)
 * @returns {UsePageLeaveReturn} Whether the pointer has left the page
 *
 * @example
 * const hasLeft = usePageLeave();
 *
 * @example
 * usePageLeave({
 *   onChange: (isLeft) => {
 *     if (isLeft) showExitIntentModal();
 *   },
 * });
 *
 * @since 0.0.15
 */
export function usePageLeave(options: UsePageLeaveOptions = {}): UsePageLeaveReturn {
  const { window = defaultWindow, onChange } = options;

  const isLeft = shallowRef(false);

  const update = (left: boolean, event: MouseEvent) => {
    if (left === isLeft.value)
      return;

    isLeft.value = left;
    onChange?.(left, event);
  };

  if (window) {
    const documentElement = window.document.documentElement;
    const listenerOptions = { passive: true } as const;

    useEventListener(window, 'mouseout', (event) => {
      const from = event.relatedTarget || (event as MouseEvent & { toElement?: EventTarget }).toElement;
      update(!from, event);
    }, listenerOptions);

    useEventListener(documentElement, 'mouseleave', (event) => {
      update(true, event);
    }, listenerOptions);

    useEventListener(documentElement, 'mouseenter', (event) => {
      update(false, event);
    }, listenerOptions);
  }

  return isLeft;
}
