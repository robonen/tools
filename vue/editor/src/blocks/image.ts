import type { Node } from '../model';
import { defineBlock } from '../registry';
import ImageBlock from './ImageBlock.vue';

export const image = defineBlock({
  type: 'image',
  spec: {
    content: { kind: 'atom' },
    group: 'block',
    attrs: {
      src: { default: '' },
      alt: { default: '' },
      caption: { default: '' },
    },
    toDOM: (node: Node) => [
      'figure',
      ['img', { src: String(node.attrs['src'] ?? ''), alt: String(node.attrs['alt'] ?? '') }],
      ['figcaption', String(node.attrs['caption'] ?? '')],
    ],
    parseDOM: [{
      tag: 'img',
      getAttrs: (el: HTMLElement) => ({ src: el.getAttribute('src') ?? '', alt: el.getAttribute('alt') ?? '' }),
    }],
  },
  component: ImageBlock,
  meta: { title: 'Image', icon: 'image', keywords: ['image', 'img', 'picture', 'photo'], group: 'media' },
});
