import type { Mark } from '../model';
import { defineMark } from '../registry';

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
      getAttrs: (el: HTMLElement) => ({
        href: el.getAttribute('href') ?? '',
        target: el.getAttribute('target') ?? '_blank',
      }),
    }],
  },
  meta: { title: 'Link', icon: 'link', hotkey: 'Mod-k' },
});
