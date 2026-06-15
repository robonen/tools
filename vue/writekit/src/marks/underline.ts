import { defineMark } from '../registry';

export const underline = defineMark({
  type: 'underline',
  spec: {
    inclusive: true,
    rank: 3,
    toDOM: () => ['u', 0],
    parseDOM: [{ tag: 'u' }],
  },
  meta: { title: 'Underline', icon: 'underline', hotkey: 'Mod-u' },
});
