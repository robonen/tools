import { defineMark } from '../registry';

export const code = defineMark({
  type: 'code',
  spec: {
    inclusive: false,
    rank: 9,
    excludes: '_all', // inline code wins: it strips every other mark on the range
    toDOM: () => ['code', 0],
    parseDOM: [{ tag: 'code' }],
  },
  meta: { title: 'Inline code', icon: 'code', hotkey: 'Mod-e' },
});
