import { toRef, watch } from 'vue';
import type { ComputedRef, MaybeRef, MaybeRefOrGetter, Ref } from 'vue';
import { isString } from '@robonen/stdlib';
import { defaultDocument } from '@/types';
import type { ConfigurableDocument } from '@/types';

export interface UseFaviconOptions extends ConfigurableDocument {
  /**
   * Base URL prepended to the icon href
   *
   * @default ''
   */
  baseUrl?: string;

  /**
   * The `rel` attribute of the favicon link element
   *
   * @default 'icon'
   */
  rel?: string;
}

export type UseFaviconReturn = ComputedRef<string | null | undefined> | Ref<string | null | undefined>;

// Matches a real file extension at the very end of the path portion of the href,
// e.g. `/foo.png` -> `png`, but NOT `/foo.png?v=2`, `data:...`, or extensionless hrefs.
const FILE_EXTENSION_RE = /\.([a-z0-9]+)$/i;

/**
 * @name useFavicon
 * @category Browser
 * @description Reactive favicon.
 *
 * @param {MaybeRefOrGetter<string | null | undefined>} [newIcon] Initial icon href. A getter or readonly ref yields a read-only `ComputedRef`; a writable ref or plain value yields a writable `Ref`.
 * @param {UseFaviconOptions} [options={}] Options
 * @returns {UseFaviconReturn} A ref bound to the favicon href
 *
 * @example
 * const favicon = useFavicon();
 * favicon.value = '/new-icon.png';
 *
 * @example
 * // Track an existing reactive source (read-only result)
 * const isDark = useDark();
 * const favicon = useFavicon(() => isDark.value ? '/dark.png' : '/light.png');
 *
 * @since 0.0.15
 */
export function useFavicon(
  newIcon: MaybeRefOrGetter<string | null | undefined>,
  options?: UseFaviconOptions,
): ComputedRef<string | null | undefined>;
export function useFavicon(
  newIcon?: MaybeRef<string | null | undefined>,
  options?: UseFaviconOptions,
): Ref<string | null | undefined>;
export function useFavicon(
  newIcon: MaybeRefOrGetter<string | null | undefined> = null,
  options: UseFaviconOptions = {},
): UseFaviconReturn {
  const {
    baseUrl = '',
    rel = 'icon',
    document = defaultDocument,
  } = options;

  const favicon = toRef(newIcon);
  const selector = `link[rel*="${rel}"]`;

  const applyIcon = (icon: string) => {
    if (!document)
      return;

    const href = `${baseUrl}${icon}`;
    const elements = document.head.querySelectorAll<HTMLLinkElement>(selector);

    if (!elements.length) {
      const link = document.createElement('link');

      link.rel = rel;
      link.href = href;

      // Only set a MIME type when the icon actually ends in a file extension;
      // otherwise we'd emit garbage like `image/png?v=2` or `image/` for
      // query-string, extensionless, or data: hrefs.
      const extension = FILE_EXTENSION_RE.exec(icon)?.[1];
      if (extension)
        link.type = `image/${extension}`;

      document.head.append(link);

      return;
    }

    for (const element of elements)
      element.href = href;
  };

  watch(
    favicon,
    (icon, oldIcon) => {
      if (isString(icon) && icon !== oldIcon)
        applyIcon(icon);
    },
    { immediate: true },
  );

  return favicon;
}
