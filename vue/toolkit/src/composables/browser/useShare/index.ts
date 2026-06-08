import { toValue } from 'vue';
import type { MaybeRefOrGetter, Ref } from 'vue';
import { defaultNavigator } from '@/types';
import type { ConfigurableNavigator } from '@/types';
import { useSupported } from '@/composables/utilities/useSupported';

export interface UseShareOptions {
  /**
   * Title of the shared content
   */
  title?: string;

  /**
   * Arbitrary text that forms the body of the message being shared
   */
  text?: string;

  /**
   * URL string referring to a resource being shared
   */
  url?: string;

  /**
   * Array of `File` objects representing files to be shared
   */
  files?: File[];
}

/**
 * Subset of `Navigator` exposing the Web Share API surface, which is not yet in
 * every lib DOM target.
 */
interface NavigatorWithShare {
  share?: (data?: UseShareOptions) => Promise<void>;
  canShare?: (data?: UseShareOptions) => boolean;
}

export interface UseShareReturn {
  /**
   * Whether the Web Share API is available
   */
  isSupported: Readonly<Ref<boolean>>;

  /**
   * Invoke the native share sheet, optionally merging `overrideData` over the
   * default share options. Resolves once sharing finishes (or is skipped when
   * unsupported / the payload cannot be shared).
   */
  share: (overrideData?: MaybeRefOrGetter<UseShareOptions>) => Promise<void>;
}

/**
 * @name useShare
 * @category Browser
 * @description Reactive Web Share API wrapper to invoke the native share sheet.
 *
 * @param {MaybeRefOrGetter<UseShareOptions>} [shareOptions={}] Default share payload (title, text, url, files)
 * @param {UseShareOptions} [options={}] Options
 * @returns {UseShareReturn} `isSupported` flag and a `share` method
 *
 * @example
 * const { share, isSupported } = useShare({ title: 'Hello', url: location.href });
 * share();
 *
 * @example
 * // Override the default payload per call
 * const { share } = useShare({ title: 'Default' });
 * share({ text: 'One-off message' });
 *
 * @since 0.0.15
 */
export function useShare(
  shareOptions: MaybeRefOrGetter<UseShareOptions> = {},
  options: ConfigurableNavigator = {},
): UseShareReturn {
  const { navigator = defaultNavigator } = options;

  const _navigator = navigator as NavigatorWithShare | undefined;
  const isSupported = useSupported(() => !!_navigator && 'canShare' in _navigator);

  const share = async (overrideData: MaybeRefOrGetter<UseShareOptions> = {}): Promise<void> => {
    if (!isSupported.value || !_navigator)
      return;

    const data: UseShareOptions = {
      ...toValue(shareOptions),
      ...toValue(overrideData),
    };

    // `canShare` gates the payload (e.g. file types / size); only proceed when it
    // accepts the data to avoid a guaranteed-to-reject `share()` call.
    if (_navigator.canShare && !_navigator.canShare(data))
      return;

    return _navigator.share?.(data);
  };

  return {
    isSupported,
    share,
  };
}
