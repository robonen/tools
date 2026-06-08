import { isRef, toValue, watch } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import { isFunction } from '@robonen/stdlib';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { useAsyncState } from '@/composables/state/useAsyncState';
import type { UseAsyncStateOptions, UseAsyncStateReturn } from '@/composables/state/useAsyncState';

export interface UseImageOptions {
  /** Address of the resource */
  src: string;
  /** Images to use in different situations, e.g. high-resolution displays, small monitors, etc. */
  srcset?: string;
  /** Image sizes for different page layouts */
  sizes?: string;
  /** Image alternative information */
  alt?: string;
  /** Image classes */
  class?: string;
  /** Image loading strategy */
  loading?: HTMLImageElement['loading'];
  /** Image CORS settings */
  crossorigin?: string;
  /** Referrer policy for fetch — https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy */
  referrerPolicy?: HTMLImageElement['referrerPolicy'];
  /** Image width */
  width?: HTMLImageElement['width'];
  /** Image height */
  height?: HTMLImageElement['height'];
  /** Image decoding hint — https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#decoding */
  decoding?: HTMLImageElement['decoding'];
  /** Relative priority hint for fetching the image */
  fetchPriority?: HTMLImageElement['fetchPriority'];
  /** Whether the image is a server-side image map */
  ismap?: HTMLImageElement['isMap'];
  /** Partial URL (starting with #) of an image map associated with the element */
  usemap?: HTMLImageElement['useMap'];
}

export interface UseImageAsyncStateOptions
  extends UseAsyncStateOptions<true, HTMLImageElement | undefined>, ConfigurableWindow {}

export type UseImageReturn = UseAsyncStateReturn<HTMLImageElement | undefined, any[], true>;

interface LoadImageContext {
  window?: Window;
}

function loadImage(options: UseImageOptions, ctx: LoadImageContext): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    // `Image` is a global constructor on `typeof globalThis`, not the `Window` interface.
    const ImageCtor = (ctx.window as (Window & typeof globalThis) | undefined)?.Image;

    if (!ImageCtor) {
      reject(new Error('useImage: no Image constructor available (are you running on the server?)'));
      return;
    }

    const img = new ImageCtor();
    const {
      src,
      srcset,
      sizes,
      alt,
      class: className,
      loading,
      crossorigin,
      referrerPolicy,
      width,
      height,
      decoding,
      fetchPriority,
      ismap,
      usemap,
    } = options;

    if (alt !== undefined) img.alt = alt;
    if (className !== undefined) img.className = className;
    if (loading !== undefined) img.loading = loading;
    if (crossorigin !== undefined) img.crossOrigin = crossorigin;
    if (referrerPolicy !== undefined) img.referrerPolicy = referrerPolicy;
    if (width !== undefined) img.width = width;
    if (height !== undefined) img.height = height;
    if (decoding !== undefined) img.decoding = decoding;
    if (fetchPriority !== undefined) img.fetchPriority = fetchPriority;
    if (ismap !== undefined) img.isMap = ismap;
    if (usemap !== undefined) img.useMap = usemap;

    // Setting srcset/sizes before src lets the browser pick the right candidate up-front.
    if (sizes !== undefined) img.sizes = sizes;
    if (srcset !== undefined) img.srcset = srcset;
    img.src = src;

    img.onload = () => resolve(img);
    img.onerror = reject;
  });
}

/**
 * @name useImage
 * @category Browser
 * @description Reactively load an image in the browser; await the result to render it or show a fallback.
 *
 * @param {MaybeRefOrGetter<UseImageOptions>} options Image attributes (as used on the `<img>` tag); pass a ref/getter to reload reactively
 * @param {UseImageAsyncStateOptions} [asyncStateOptions={}] `useAsyncState` options (`delay`, `immediate`, `onError`, …) plus a configurable `window`
 * @returns {UseImageReturn} `useAsyncState`-shaped `{ isLoading, isReady, error, state, execute, … }` for an `HTMLImageElement`
 *
 * @example
 * const { isLoading, error, state: image } = useImage({ src: '/cat.png' });
 *
 * @example
 * // Reactive source: reloads whenever `src` changes
 * const src = ref('/a.png');
 * const { state } = useImage(() => ({ src: src.value, alt: 'photo' }));
 *
 * @since 0.0.15
 */
export function useImage(
  options: MaybeRefOrGetter<UseImageOptions>,
  asyncStateOptions: UseImageAsyncStateOptions = {},
): UseImageReturn {
  const { window = defaultWindow, ...stateOptions } = asyncStateOptions;

  const state = useAsyncState<HTMLImageElement | undefined>(
    () => loadImage(toValue(options), { window }),
    undefined,
    {
      resetOnExecute: true,
      ...stateOptions,
    },
  );

  // A plain (non-ref, non-getter) options object can never change, so we skip
  // the watcher entirely — no needless deep traversal on every tick.
  if (isRef(options) || isFunction(options)) {
    watch(
      () => toValue(options),
      () => state.execute(stateOptions.delay),
      { deep: true },
    );
  }

  return state;
}
