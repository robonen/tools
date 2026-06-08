import { computed, toRef, watch } from 'vue';
import type { ComputedRef, MaybeRefOrGetter, Ref, WritableComputedRef } from 'vue';
import { isString } from '@robonen/stdlib';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { unrefElement } from '@/composables/component/unrefElement';
import type { MaybeElementRef } from '@/composables/component/unrefElement';
import { usePreferredDark } from '@/composables/browser/usePreferredDark';
import { useStorage } from '@/composables/storage/useStorage';
import type { UseStorageOptions } from '@/composables/storage/useStorage';
import { tryOnMounted } from '@/composables/lifecycle/tryOnMounted';

export type BasicColorMode = 'light' | 'dark';
export type BasicColorSchema = BasicColorMode | 'auto';

export interface UseColorModeOptions<T extends string = BasicColorMode> extends UseStorageOptions<T | BasicColorMode>, ConfigurableWindow {
  /**
   * CSS selector (or element ref) for the target element the mode is applied to.
   *
   * @default 'html'
   */
  selector?: string | MaybeElementRef;

  /**
   * HTML attribute applied to the target element. Use `'class'` to toggle
   * classes, or any attribute name (e.g. `'data-theme'`) to set its value.
   *
   * @default 'class'
   */
  attribute?: string;

  /**
   * The initial color mode used when no value is stored.
   *
   * @default 'auto'
   */
  initialValue?: MaybeRefOrGetter<T | BasicColorSchema>;

  /**
   * Map of color mode to the value applied to the target element. Extend this
   * to support custom modes beyond `light`/`dark`/`auto`.
   *
   * @default { auto: '', light: 'light', dark: 'dark' }
   */
  modes?: Partial<Record<T | BasicColorSchema, string>>;

  /**
   * Custom handler called whenever the resolved mode changes. Receives the
   * resolved mode and the default handler, allowing you to opt out of (or
   * extend) the default DOM update.
   */
  onChanged?: (mode: T | BasicColorMode, defaultHandler: (mode: T | BasicColorMode) => void) => void;

  /**
   * Use a custom ref as the storage backing instead of `useStorage`.
   */
  storageRef?: Ref<T | BasicColorSchema>;

  /**
   * The key persisted into storage. Pass `null` to disable persistence
   * (the mode lives only in memory).
   *
   * @default 'vuetools-color-scheme'
   */
  storageKey?: string | null;

  /**
   * Custom storage backend. Defaults to `window.localStorage`.
   */
  storage?: Storage;

  /**
   * Emit `'auto'` as the writable ref value when in auto mode, instead of the
   * resolved `'light'`/`'dark'`. Useful for binding a tri-state UI.
   *
   * @default false
   */
  emitAuto?: boolean;

  /**
   * Briefly disable CSS transitions while the mode is applied, preventing a
   * flash of transitioning colors during the switch.
   *
   * @default true
   */
  disableTransition?: boolean;
}

export type UseColorModeReturn<T extends string = BasicColorMode>
  = WritableComputedRef<T | BasicColorSchema> & {
    store: Ref<T | BasicColorSchema>;
    system: ComputedRef<BasicColorMode>;
    state: ComputedRef<T | BasicColorMode>;
  };

const CSS_DISABLE_TRANS = '*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}';

/**
 * @name useColorMode
 * @category Browser
 * @description Reactive color mode (`light` / `dark` / `auto`) with system
 * detection, storage persistence, and automatic application of a class or
 * attribute to a target element.
 *
 * @param {UseColorModeOptions<T>} [options={}] Options
 * @returns {UseColorModeReturn<T>} A writable ref of the mode, augmented with `{ store, system, state }`
 *
 * @example
 * const mode = useColorMode();
 * mode.value = 'dark';
 *
 * @example
 * // Custom modes and a data attribute
 * const mode = useColorMode({
 *   attribute: 'data-theme',
 *   modes: { dim: 'dim', cafe: 'cafe' },
 * });
 *
 * @example
 * // Read the resolved system + effective state
 * const { system, state } = useColorMode();
 *
 * @since 0.0.15
 */
export function useColorMode<T extends string = BasicColorMode>(
  options: UseColorModeOptions<T> = {},
): UseColorModeReturn<T> {
  const {
    selector = 'html',
    attribute = 'class',
    initialValue = 'auto',
    window = defaultWindow,
    storage,
    storageKey = 'vuetools-color-scheme',
    listenToStorageChanges = true,
    storageRef,
    emitAuto = false,
    disableTransition = true,
  } = options;

  const modes = {
    auto: '',
    light: 'light',
    dark: 'dark',
    ...options.modes,
  } as Record<BasicColorSchema | T, string>;

  const preferredDark = usePreferredDark({ window });
  const system = computed<BasicColorMode>(() => preferredDark.value ? 'dark' : 'light');

  const resolveStore = (): Ref<T | BasicColorSchema> => {
    if (storageRef)
      return storageRef;

    if (storageKey === null || storageKey === undefined)
      return toRef(initialValue) as Ref<T | BasicColorSchema>;

    const backend = storage ?? window?.localStorage;

    if (!backend)
      return toRef(initialValue) as Ref<T | BasicColorSchema>;

    return useStorage<T | BasicColorSchema>(storageKey, initialValue, backend, {
      window,
      listenToStorageChanges,
    });
  };

  const store = resolveStore();

  const state = computed<T | BasicColorMode>(() =>
    store.value === 'auto'
      ? system.value
      : store.value as T | BasicColorMode);

  const updateHTMLAttrs = (target: string | MaybeElementRef, attr: string, value: string): void => {
    const element = isString(target)
      ? window?.document?.querySelector(target)
      : unrefElement(target);

    if (!element)
      return;

    const classesToAdd = new Set<string>();
    const classesToRemove = new Set<string>();
    let attributeToChange: { key: string; value: string } | null = null;

    if (attr === 'class') {
      const next = new Set(value.split(/\s/g));

      // Toggle only the classes this composable owns (derived from `modes`),
      // so unrelated classes on the element are left untouched.
      for (const owned of Object.values<string>(modes).flatMap(mode => (mode || '').split(/\s/g)).filter(Boolean)) {
        if (next.has(owned))
          classesToAdd.add(owned);
        else
          classesToRemove.add(owned);
      }
    }
    else {
      attributeToChange = { key: attr, value };
    }

    if (classesToAdd.size === 0 && classesToRemove.size === 0 && attributeToChange === null)
      return;

    let style: HTMLStyleElement | undefined;

    if (disableTransition && window?.document) {
      style = window.document.createElement('style');
      style.append(window.document.createTextNode(CSS_DISABLE_TRANS));
      window.document.head.append(style);
    }

    for (const className of classesToAdd)
      element.classList.add(className);

    for (const className of classesToRemove)
      element.classList.remove(className);

    if (attributeToChange)
      element.setAttribute(attributeToChange.key, attributeToChange.value);

    if (style && window?.document) {
      // Force a reflow so the no-transition style is flushed before removal.
      void window.getComputedStyle(style).opacity;
      style.remove();
    }
  };

  const defaultOnChanged = (mode: T | BasicColorMode): void => {
    updateHTMLAttrs(selector, attribute, modes[mode] ?? mode);
  };

  const onChanged = (mode: T | BasicColorMode): void => {
    if (options.onChanged)
      options.onChanged(mode, defaultOnChanged);
    else
      defaultOnChanged(mode);
  };

  watch(state, onChanged, { flush: 'post', immediate: true });

  tryOnMounted(() => onChanged(state.value));

  const mode = computed<T | BasicColorSchema>({
    get() {
      return emitAuto ? store.value : state.value;
    },
    set(value) {
      store.value = value;
    },
  });

  return Object.assign(mode, { store, system, state }) as UseColorModeReturn<T>;
}
