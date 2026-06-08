import { defineMark } from '../registry';

export const bold = defineMark({
  type: 'bold',
  spec: {
    inclusive: true,
    rank: 1,
    toDOM: () => ['strong', 0],
    parseDOM: [{ tag: 'strong' }, { tag: 'b' }],
  },
  meta: { title: 'Bold', icon: 'bold', hotkey: 'Mod-b' },
});
