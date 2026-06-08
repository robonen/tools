import { defineBlock } from '../registry';

export const blockquote = defineBlock({
  type: 'blockquote',
  spec: {
    content: { kind: 'text' },
    group: 'block',
    toDOM: () => ['blockquote', 0],
    parseDOM: [{ tag: 'blockquote' }],
  },
  inputRules: [{ match: /^>\s$/ }],
  meta: { title: 'Quote', icon: 'quote', keywords: ['quote', 'blockquote', 'citation'], group: 'basic' },
});
