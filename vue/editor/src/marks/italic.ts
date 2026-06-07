import { defineMark } from '../registry';

export const italic = defineMark({
  type: 'italic',
  spec: {
    inclusive: true,
    rank: 2,
    toDOM: () => ['em', 0],
    parseDOM: [{ tag: 'em' }, { tag: 'i' }],
  },
  meta: { title: 'Italic', icon: 'italic', hotkey: 'Mod-i' },
});
