import { defineMark } from '../registry';

export const underline = defineMark({
  type: 'underline',
  spec: {
    inclusive: true,
    rank: 3,
    toDOM: () => ['u', 0],
    parseDOM: [
      { tag: 'u' },
      { style: 'text-decoration', getAttrs: (el: HTMLElement) => (el.style.textDecoration.includes('underline') ? {} : false) },
      { style: 'text-decoration-line', getAttrs: (el: HTMLElement) => (el.style.textDecorationLine.includes('underline') ? {} : false) },
    ],
  },
  meta: { title: 'Underline', icon: 'underline', hotkey: 'Mod-u' },
});
