import { defineMark } from '../registry';

export const italic = defineMark({
  type: 'italic',
  spec: {
    inclusive: true,
    rank: 2,
    toDOM: () => ['em', 0],
    parseDOM: [
      { tag: 'em' },
      { tag: 'i', getAttrs: (el: HTMLElement) => (el.style.fontStyle === 'normal' ? false : {}) },
      { style: 'font-style', getAttrs: (el: HTMLElement) => (/^(?:italic|oblique)/.test(el.style.fontStyle) ? {} : false) },
    ],
  },
  meta: { title: 'Italic', icon: 'italic', hotkey: 'Mod-i' },
});
