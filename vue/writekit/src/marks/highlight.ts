import { defineMark } from '../registry';

export const highlight = defineMark({
  type: 'highlight',
  spec: {
    inclusive: true,
    rank: 5,
    toDOM: () => ['mark', 0],
    parseDOM: [{ tag: 'mark' }],
  },
  meta: { title: 'Highlight', icon: 'highlighter' },
});
