import { defineMark } from '../registry';

export const strike = defineMark({
  type: 'strike',
  spec: {
    inclusive: true,
    rank: 4,
    toDOM: () => ['s', 0],
    parseDOM: [{ tag: 's' }, { tag: 'del' }],
  },
  meta: { title: 'Strikethrough', icon: 'strikethrough', hotkey: 'Mod-Shift-s' },
});
