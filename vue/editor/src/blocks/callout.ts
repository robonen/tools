import type { Node } from '../model';
import { defineBlock } from '../registry';

export const callout = defineBlock({
  type: 'callout',
  spec: {
    content: { kind: 'text' },
    group: 'block',
    attrs: { variant: { default: 'info' } },
    toDOM: (node: Node) => ['div', { 'data-callout': String(node.attrs['variant'] ?? 'info') }, 0],
    parseDOM: [{
      tag: 'div[data-callout]',
      getAttrs: (el: HTMLElement) => ({ variant: el.getAttribute('data-callout') ?? 'info' }),
    }],
  },
  meta: { title: 'Callout', icon: 'info', keywords: ['callout', 'note', 'info', 'warning'], group: 'basic' },
});
