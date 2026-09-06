import { defineMark } from '../registry';

export const strike = defineMark({
  type: 'strike',
  spec: {
    inclusive: true,
    rank: 4,
    toDOM: () => ['s', 0],
    parseDOM: [
      { tag: 's' },
      { tag: 'del' },
      { tag: 'strike' },
      { style: 'text-decoration', getAttrs: (el: HTMLElement) => (el.style.textDecoration.includes('line-through') ? {} : false) },
      { style: 'text-decoration-line', getAttrs: (el: HTMLElement) => (el.style.textDecorationLine.includes('line-through') ? {} : false) },
    ],
  },
  meta: { title: 'Strikethrough', icon: 'strikethrough', hotkey: 'Mod-Shift-s' },
});
