import type { Inline, InlineNode, Node, Writekit } from '@writekit';
import {
  createDefaultRegistry,
  createDoc,
  createNode,
  createWritekit,
  createWritekitState,
} from '@writekit';

/** A styled inline run: `t('hello', 'bold', 'italic')`. */
export function t(text: string, ...markTypes: string[]): InlineNode {
  return { text, marks: markTypes.map(type => ({ type })) };
}

/** A paragraph block from a string or inline runs. */
export function p(content: string | Inline = ''): Node {
  const inline = typeof content === 'string' ? (content ? [t(content)] : []) : content;
  return createNode('paragraph', { content: inline });
}

/** A heading block. */
export function h(level: number, text: string): Node {
  return createNode('heading', { attrs: { level }, content: text ? [t(text)] : [] });
}

export const quote = (text: string): Node => createNode('blockquote', { content: text ? [t(text)] : [] });
export const code = (text: string): Node => createNode('code-block', { content: text ? [t(text)] : [] });
export const callout = (variant: string, text: string): Node => createNode('callout', { attrs: { variant }, content: [t(text)] });
export const bullet = (text: string, indent = 0): Node => createNode('bulleted-list', { attrs: { indent }, content: [t(text)] });
export const numbered = (text: string, indent = 0): Node => createNode('numbered-list', { attrs: { indent }, content: [t(text)] });
export const todo = (text: string, checked = false): Node => createNode('todo-list', { attrs: { checked, indent: 0 }, content: [t(text)] });
export const divider = (): Node => createNode('divider');
export const image = (src: string, caption = ''): Node => createNode('image', { attrs: { src, alt: caption, caption } });

/** Create an writekit over the given blocks with the default registry. */
export function makeWritekit(content: Node[]): Writekit {
  const registry = createDefaultRegistry();
  return createWritekit({ state: createWritekitState({ registry, doc: createDoc(content) }) });
}
