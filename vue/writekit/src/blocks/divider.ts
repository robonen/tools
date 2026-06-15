import { defineBlock } from '../registry';
import DividerBlock from './DividerBlock.vue';

export const divider = defineBlock({
  type: 'divider',
  spec: {
    content: { kind: 'atom' },
    group: 'block',
    toDOM: () => ['hr'],
    parseDOM: [{ tag: 'hr' }],
  },
  component: DividerBlock,
  meta: { title: 'Divider', icon: 'minus', keywords: ['divider', 'hr', 'rule', 'separator'], group: 'media' },
});
