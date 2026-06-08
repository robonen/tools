import { shallowReadonly, shallowRef, toValue } from 'vue';
import type { MaybeRefOrGetter, Ref } from 'vue';
import { isFunction, noop } from '@robonen/stdlib';
import { defaultNavigator } from '@/types';
import type { ConfigurableNavigator } from '@/types';
import { useSupported } from '@/composables/utilities/useSupported';
import { useEventListener } from '@/composables/browser/useEventListener';
import { useTimeoutFn } from '@/composables/animation/useTimeoutFn';

/**
 * A value to copy: either concrete `ClipboardItems` or an (optionally async)
 * getter that resolves to them.
 */
export type ClipboardItemsValue
  = | ClipboardItems
    | (() => Promise<ClipboardItems | undefined> | ClipboardItems | undefined);

export interface UseClipboardItemsOptions<Source> extends ConfigurableNavigator {
  /**
   * Sync `content` with the system clipboard by listening to copy/cut events
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

  /**
   * Called when a read/write rejects, instead of throwing
   *
   * @default noop
   */
  onError?: (error: unknown) => void;
}

export interface UseClipboardItemsReturn<Optional extends boolean> {
  /**
   * Whether the async Clipboard API (with `ClipboardItem`) is available
   */
  isSupported: Readonly<Ref<boolean>>;

  /**
   * The current clipboard items (kept in sync when `read` is enabled)
   */
  content: Readonly<Ref<ClipboardItems>>;

  /**
   * `true` for `copiedDuring` ms after a successful copy
   */
  copied: Readonly<Ref<boolean>>;

  /**
   * `true` while an async `copy()` is in flight
   */
  copyPending: Readonly<Ref<boolean>>;

  /**
   * Copy clipboard items to the system clipboard
   */
  copy: Optional extends true
    ? (content?: ClipboardItemsValue) => Promise<void>
    : (content: ClipboardItemsValue) => Promise<void>;

  /**
   * Manually read the system clipboard into `content`
   */
  read: () => Promise<void>;
}

/**
 * @name useClipboardItems
 * @category Browser
 * @description Reactive async Clipboard API with rich `ClipboardItem` support
 * (read/write images, HTML, and arbitrary MIME types — not just text).
 * SSR-safe; uses passive `copy`/`cut` listeners and guards stale async writes.
 *
 * @param {UseClipboardItemsOptions} [options={}] Options
 * @returns {UseClipboardItemsReturn} `isSupported`, `content`, `copied`, `copyPending`, `copy`, and `read`
 *
 * @example
 * const { content, copy, copied, isSupported } = useClipboardItems();
 * copy([new ClipboardItem({ 'text/plain': new Blob(['hello'], { type: 'text/plain' }) })]);
 *
 * @example
 * // Copy a lazily/asynchronously resolved value, kept in sync with the system clipboard
 * const { content } = useClipboardItems({ read: true });
 * copy(async () => buildClipboardItems());
 *
 * @since 0.0.15
 */
export function useClipboardItems(options?: UseClipboardItemsOptions<undefined>): UseClipboardItemsReturn<false>;
export function useClipboardItems(options: UseClipboardItemsOptions<MaybeRefOrGetter<ClipboardItems>>): UseClipboardItemsReturn<true>;
export function useClipboardItems(
  options: UseClipboardItemsOptions<MaybeRefOrGetter<ClipboardItems> | undefined> = {},
): UseClipboardItemsReturn<boolean> {
  const {
    navigator = defaultNavigator,
    read = false,
    source,
    copiedDuring = 1500,
    onError = noop,
  } = options;

  const isSupported = useSupported(() => navigator && 'clipboard' in navigator);

  const content = shallowRef<ClipboardItems>([]);
  const copied = shallowRef(false);
  const copyPending = shallowRef(false);

  // Guards against a slow async copy clobbering the result of a newer one
  let lastResolveId = 0;

  const timeout = useTimeoutFn(() => {
    copied.value = false;
  }, copiedDuring, { immediate: false });

  async function updateContent(): Promise<void> {
    if (!isSupported.value)
      return;

    try {
      content.value = await navigator!.clipboard.read();
    }
    catch (error) {
      onError(error);
    }
  }

  if (isSupported.value && read)
    useEventListener(['copy', 'cut'], updateContent, { passive: true });

  async function copy(value: ClipboardItemsValue | undefined = toValue(source)): Promise<void> {
    if (!isSupported.value || value === null || value === undefined)
      return;

    copyPending.value = true;

    try {
      let resolved: ClipboardItems | undefined;

      if (isFunction(value)) {
        const currentId = ++lastResolveId;
        resolved = await value();

        // Drop a stale async resolution superseded by a newer copy
        if (resolved === null || resolved === undefined || currentId !== lastResolveId)
          return;
      }
      else {
        resolved = value;
      }

      await navigator!.clipboard.write(resolved);

      content.value = resolved;
      copied.value = true;
      timeout.start();
    }
    catch (error) {
      onError(error);
    }
    finally {
      copyPending.value = false;
    }
  }

  return {
    isSupported,
    content: shallowReadonly(content),
    copied: shallowReadonly(copied),
    copyPending: shallowReadonly(copyPending),
    copy,
    read: updateContent,
  };
}
