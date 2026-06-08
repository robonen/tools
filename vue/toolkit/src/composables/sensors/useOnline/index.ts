import { shallowReadonly, shallowRef } from 'vue';
import type { ShallowRef } from 'vue';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { useEventListener } from '@/composables/browser/useEventListener';

export interface UseOnlineOptions extends ConfigurableWindow {}

/**
 * @name useOnline
 * @category Sensors
 * @description Reactive online/offline status based on `navigator.onLine`.
 * For connection details (effectiveType, downlink, saveData, transition
 * timestamps, ...) use {@link useNetwork} instead.
 *
 * @param {UseOnlineOptions} [options={}] Options
 * @returns {Readonly<ShallowRef<boolean>>} Whether the browser is online
 *
 * @example
 * const online = useOnline();
 *
 * @since 0.0.15
 */
export function useOnline(options: UseOnlineOptions = {}): Readonly<ShallowRef<boolean>> {
  const { window = defaultWindow } = options;

  const isOnline = shallowRef(window?.navigator?.onLine ?? true);

  useEventListener(window, 'online', () => {
    isOnline.value = true;
  }, { passive: true });

  useEventListener(window, 'offline', () => {
    isOnline.value = false;
  }, { passive: true });

  return shallowReadonly(isOnline);
}
