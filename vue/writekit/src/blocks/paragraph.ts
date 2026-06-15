import { defineBlock } from '../registry';

export const paragraph = defineBlock({
  type: 'paragraph',
  spec: {
    content: { kind: 'text' },
    group: 'block',
    toDOM: () => ['p', 0],
    parseDOM: [{ tag: 'p' }],
  },
  placeholder: 'Write something…',
  meta: { title: 'Paragraph', icon: 'text', keywords: ['paragraph', 'text', 'p'], group: 'basic' },
});
