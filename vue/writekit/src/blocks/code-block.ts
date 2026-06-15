import type { Node } from '../model';
import { defineBlock } from '../registry';

export const codeBlock = defineBlock({
  type: 'code-block',
  spec: {
    content: { kind: 'text', marks: 'none' }, // raw text, no inline formatting
    group: 'block',
    code: true, // Enter inserts a newline instead of splitting
    defining: true,
    attrs: { language: { default: 'plain' } },
    toDOM: (node: Node) => ['pre', { 'data-language': String(node.attrs['language'] ?? 'plain') }, 0],
    parseDOM: [{ tag: 'pre' }],
  },
  meta: { title: 'Code block', icon: 'code', keywords: ['code', 'pre', 'snippet'], group: 'basic' },
});
