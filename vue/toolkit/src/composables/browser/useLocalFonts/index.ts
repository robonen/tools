import { shallowRef } from 'vue';
import type { ComputedRef, ShallowRef } from 'vue';
import { noop } from '@robonen/stdlib';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { useSupported } from '@/composables/utilities/useSupported';
import { tryOnMounted } from '@/composables/lifecycle/tryOnMounted';

/**
 * A single font face exposed by the [Local Font Access API](https://developer.mozilla.org/en-US/docs/Web/API/FontData).
 */
export interface FontData {
  /**
   * The PostScript name of the font (e.g. `"Arial-BoldMT"`)
   */
  readonly postscriptName: string;

  /**
   * The full, human-readable name of the font (e.g. `"Arial Bold"`)
   */
  readonly fullName: string;

  /**
   * The font family (e.g. `"Arial"`)
   */
  readonly family: string;

  /**
   * The font style/subfamily (e.g. `"Bold"`)
   */
  readonly style: string;

  /**
   * Resolve the raw font file as a `Blob` (the full SFNT binary)
   */
  blob: () => Promise<Blob>;
}

export interface QueryLocalFontsOptions {
  /**
   * Restrict the results to the fonts whose PostScript names appear in this list.
   */
  postscriptNames?: string[];
}

interface WindowWithLocalFonts {
  queryLocalFonts: (options?: QueryLocalFontsOptions) => Promise<FontData[]>;
}

export interface UseLocalFontsOptions extends ConfigurableWindow {
  /**
   * Query the local fonts immediately on mount. The Local Font Access API
   * requires the `local-fonts` permission (which may prompt the user), so this
   * is disabled by default — call `query()` from a user gesture instead.
   *
   * @default false
   */
  immediate?: boolean;

  /**
   * Called when a query rejects (e.g. the permission is denied) instead of
   * throwing. The same value is also stored in the returned `error` ref.
   *
   * @default noop
   */
  onError?: (error: unknown) => void;
}

export interface UseLocalFontsReturn {
  /**
   * Whether the [Local Font Access API](https://developer.mozilla.org/en-US/docs/Web/API/Local_Font_Access_API) is supported
   */
  isSupported: ComputedRef<boolean>;

  /**
   * The fonts returned by the most recent successful `query()`
   */
  fonts: ShallowRef<FontData[]>;

  /**
   * The last error thrown by `query()`, or `null`
   */
  error: ShallowRef<unknown | null>;

  /**
   * Enumerate the locally installed fonts. Resolves with the font list, or
   * `undefined` when the API is unsupported. Pass `postscriptNames` to filter.
   */
  query: (queryOptions?: QueryLocalFontsOptions) => Promise<FontData[] | undefined>;
}

/**
 * @name useLocalFonts
 * @category Browser
 * @description Reactive wrapper around the [Local Font Access API](https://developer.mozilla.org/en-US/docs/Web/API/Local_Font_Access_API) for enumerating the user's locally installed fonts.
 *
 * @param {UseLocalFontsOptions} [options={}] Options
 * @param {boolean} [options.immediate=false] Query immediately on mount (requires the `local-fonts` permission)
 * @param {Function} [options.onError=noop] Error callback invoked instead of throwing
 * @param {Window} [options.window=defaultWindow] Custom `window` instance
 * @returns {UseLocalFontsReturn} `isSupported`, `fonts`, `error`, and `query()`
 *
 * @example
 * const { isSupported, fonts, query } = useLocalFonts();
 * // Call from a click handler so the permission prompt is allowed
 * async function pickFonts() {
 *   await query();
 *   console.log(fonts.value.map(font => font.fullName));
 * }
 *
 * @example
 * // Query only specific fonts by PostScript name
 * const { fonts, query } = useLocalFonts();
 * await query({ postscriptNames: ['Arial-BoldMT'] });
 *
 * @since 0.0.15
 */
export function useLocalFonts(options: UseLocalFontsOptions = {}): UseLocalFontsReturn {
  const {
    window = defaultWindow,
    immediate = false,
    onError = noop,
  } = options;

  const isSupported = useSupported(() => !!window && 'queryLocalFonts' in window);
  const fonts = shallowRef<FontData[]>([]);
  const error = shallowRef<unknown | null>(null);

  async function query(queryOptions?: QueryLocalFontsOptions): Promise<FontData[] | undefined> {
    if (!isSupported.value || !window)
      return undefined;

    error.value = null;

    try {
      const result = await (window as unknown as WindowWithLocalFonts).queryLocalFonts(queryOptions);
      fonts.value = result;

      return result;
    }
    catch (err) {
      error.value = err;
      onError(err);

      return undefined;
    }
  }

  if (immediate)
    tryOnMounted(() => query());

  return {
    isSupported,
    fonts,
    error,
    query,
  };
}
