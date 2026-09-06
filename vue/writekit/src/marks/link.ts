import type { Mark } from '../model';
import { defineMark } from '../registry';

const SAFE_SCHEMES = new Set(['http', 'https', 'mailto', 'tel']);

/** Relative URLs and the web schemes; `javascript:` and friends are refused at the parse boundary. */
export function isSafeHref(href: string): boolean {
  const scheme = /^\s*([a-z][a-z0-9+.-]*):/i.exec(href)?.[1];
  return scheme === undefined || SAFE_SCHEMES.has(scheme.toLowerCase());
}

export const link = defineMark({
  type: 'link',
  spec: {
    inclusive: false, // typing past a link's end does not extend it
    rank: 10,
    attrs: {
      href: { default: '' },
      target: { default: '_blank' },
    },
    toDOM: (mark: Mark) => [
      'a',
      {
        href: String(mark.attrs?.['href'] ?? ''),
        target: String(mark.attrs?.['target'] ?? '_blank'),
        rel: 'noopener noreferrer',
      },
      0,
    ],
    parseDOM: [{
      tag: 'a[href]',
      getAttrs: (el: HTMLElement) => {
        const href = el.getAttribute('href') ?? '';
        return isSafeHref(href) ? { href, target: el.getAttribute('target') ?? '_blank' } : false;
      },
    }],
  },
  meta: { title: 'Link', icon: 'link', hotkey: 'Mod-k' },
});
