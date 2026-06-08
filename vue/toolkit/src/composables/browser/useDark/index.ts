import { computed } from 'vue';
import type { WritableComputedRef } from 'vue';
import { useColorMode } from '@/composables/browser/useColorMode';
import type { BasicColorSchema, UseColorModeOptions } from '@/composables/browser/useColorMode';

export interface UseDarkOptions extends Omit<UseColorModeOptions<BasicColorSchema>, 'modes' | 'onChanged'> {
  /**
   * Value applied to the target element when `isDark` is `true`.
   *
   * @default 'dark'
   */
  valueDark?: string;

  /**
   * Value applied to the target element when `isDark` is `false`.
   *
   * @default ''
   */
  valueLight?: string;

  /**
   * Custom handler called whenever the resolved mode changes. When specified,
   * the default DOM update is overridden (call `defaultHandler` to keep it).
   *
   * @default undefined
   */
  onChanged?: (isDark: boolean, defaultHandler: (mode: BasicColorSchema) => void, mode: BasicColorSchema) => void;
}

export type UseDarkReturn = WritableComputedRef<boolean>;

/**
 * @name useDark
 * @category Browser
 * @description Reactive dark mode boolean with system detection and storage
 * persistence, built on `useColorMode`. Writing `false` while the system
 * already prefers light (or `true` while it prefers dark) falls back to
 * `'auto'`, so the mode keeps tracking the OS preference.
 *
 * @param {UseDarkOptions} [options={}] Options
 * @returns {UseDarkReturn} A writable boolean ref; `true` when dark mode is active
 *
 * @example
 * const isDark = useDark();
 * isDark.value = true;
 *
 * @example
 * // Toggle a data attribute instead of a class
 * const isDark = useDark({
 *   attribute: 'data-theme',
 *   valueDark: 'dark',
 *   valueLight: 'light',
 * });
 *
 * @example
 * import { useToggle } from '@/composables/state/useToggle';
 *
 * const isDark = useDark();
 * const toggleDark = useToggle(isDark);
 *
 * @since 0.0.15
 */
export function useDark(options: UseDarkOptions = {}): UseDarkReturn {
  const {
    valueDark = 'dark',
    valueLight = '',
  } = options;

  const mode = useColorMode({
    ...options,
    onChanged: (resolved, defaultHandler) => {
      if (options.onChanged)
        options.onChanged(resolved === 'dark', defaultHandler, resolved);
      else
        defaultHandler(resolved);
    },
    modes: {
      dark: valueDark,
      light: valueLight,
    },
  });

  const isDark = computed<boolean>({
    get() {
      return mode.state.value === 'dark';
    },
    set(value) {
      const next = value ? 'dark' : 'light';

      // When the requested state already matches the system preference, fall
      // back to `'auto'` so the mode keeps following the OS going forward.
      mode.value = mode.system.value === next ? 'auto' : next;
    },
  });

  return isDark;
}
