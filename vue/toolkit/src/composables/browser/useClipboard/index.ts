import { shallowReadonly, shallowRef, toValue } from 'vue';
import type { MaybeRefOrGetter, Ref } from 'vue';
import { isString } from '@robonen/stdlib';
import { defaultNavigator } from '@/types';
import type { ConfigurableNavigator } from '@/types';
import { useSupported } from '@/composables/utilities/useSupported';
import { useEventListener } from '@/composables/browser/useEventListener';
import { useTimeoutFn } from '@/composables/animation/useTimeoutFn';

/**
 * A value to copy: either a string or an (optionally async) getter that resolves to one.
 */
export type ClipboardValue = string | (() => Promise<string | undefined> | string | undefined);

export interface UseClipboardOptions<Source> extends ConfigurableNavigator {
  /**
   * Sync `text` with the system clipboard by listening to copy/cut events
   *
   * @default false
   */
  read?: boolean;

  /**
   * Default source value to copy when `copy()` is called without an argument
   */
  source?: Source;

  /**
   * Milliseconds the `copied` flag stays `true` after a copy
   *
   * @default 1500
   */
  copiedDuring?: number;
}

export interface UseClipboardReturn<Optional extends boolean> {
  /**
   * Whether the async Clipboard API is available
   */
  isSupported: Readonly<Ref<boolean>>;

  /**
   * The current clipboard text (kept in sync when `read` is enabled)
   */
  text: Readonly<Ref<string>>;

  /**
   * `true` for `copiedDuring` ms after a successful copy
   */
  copied: Readonly<Ref<boolean>>;

  /**
   * `true` while an async `copy()` is in flight
   */
  copyPending: Readonly<Ref<boolean>>;

  /**
   * Copy a value to the clipboard
   */
  copy: Optional extends true ? (text?: ClipboardValue) => Promise<void> : (text: ClipboardValue) => Promise<void>;
}

/**
 * @name useClipboard
 * @category Browser
 * @description Reactive async Clipboard API.
 *
 * @param {UseClipboardOptions} [options={}] Options
 * @returns {UseClipboardReturn} `isSupported`, `text`, `copied`, `copyPending`, and `copy`
 *
 * @example
 * const { text, copy, copied, isSupported } = useClipboard();
 * copy('hello');
 *
 * @example
 * // Copy a lazily/asynchronously resolved value
 * copy(async () => (await fetch('/token').then(r => r.text())));
 *
 * @since 0.0.15
 */
export function useClipboard(options?: UseClipboardOptions<undefined>): UseClipboardReturn<false>;
export function useClipboard(options: UseClipboardOptions<MaybeRefOrGetter<string>>): UseClipboardReturn<true>;
export function useClipboard(
  options: UseClipboardOptions<MaybeRefOrGetter<string> | undefined> = {},
): UseClipboardReturn<boolean> {
  const {
    navigator = defaultNavigator,
    read = false,
    source,
    copiedDuring = 1500,
  } = options;

  const isSupported = useSupported(() => navigator && 'clipboard' in navigator);

  const text = shallowRef('');
  const copied = shallowRef(false);
  const copyPending = shallowRef(false);

  // Guards against a slow async copy clobbering the result of a newer one
  let lastResolveId = 0;

  const timeout = useTimeoutFn(() => {
    copied.value = false;
  }, copiedDuring, { immediate: false });

  async function updateText(): Promise<void> {
    text.value = await navigator!.clipboard.readText();
  }

  if (isSupported.value && read)
    useEventListener(['copy', 'cut'], updateText, { passive: true });

  async function copy(value: ClipboardValue | undefined = toValue(source)): Promise<void> {
    if (!isSupported.value || value === null || value === undefined)
      return;

    copyPending.value = true;

    try {
      let resolved: string | undefined;

      if (isString(value)) {
        resolved = value;
      }
      else {
        const currentId = ++lastResolveId;
        resolved = await value();

        // Drop a stale async resolution superseded by a newer copy
        if (resolved === null || resolved === undefined || currentId !== lastResolveId)
          return;
      }

      await navigator!.clipboard.writeText(resolved);

      text.value = resolved;
      copied.value = true;
      timeout.start();
    }
    finally {
      copyPending.value = false;
    }
  }

  return {
    isSupported,
    text: shallowReadonly(text),
    copied: shallowReadonly(copied),
    copyPending: shallowReadonly(copyPending),
    copy,
  };
}
