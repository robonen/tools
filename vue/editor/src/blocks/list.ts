import type { Node } from '../model';
import type { AttrsSpec } from '../schema';
import { defineBlock } from '../registry';

type ListType = 'bullet' | 'ordered' | 'todo';

function indentOf(node: Node): number {
  return typeof node.attrs['indent'] === 'number' ? node.attrs['indent'] : 0;
}

/**
 * DRY factory for the three list variants. Lists are **flat-with-indent**: each
 * item is its own top-level text block carrying an `indent` attribute (and
 * `checked` for to-dos). Markers/numbering and indentation are presentation
 * (CSS), so the model stays a simple flat block list that maps cleanly to a CRDT.
 */
function defineListBlock(options: { type: string; listType: ListType; title: string; keywords: readonly string[] }) {
  const todo = options.listType === 'todo';

  const attrs: AttrsSpec = {
    indent: { default: 0 },
    ...(todo ? { checked: { default: false } } : {}),
  };

  const inputRules = options.listType === 'bullet'
    ? [{ match: /^[-*]\s$/ }]
    : options.listType === 'ordered'
      ? [{ match: /^\d+\.\s$/ }]
      : [{ match: /^\[\s?\]\s$/ }];

  return defineBlock({
    type: options.type,
    spec: {
      content: { kind: 'text' },
      group: 'list',
      attrs,
      toDOM: (node: Node) => ['div', {
        'data-list': options.listType,
        // margin shifts the item per indent level; padding leaves a gutter for the marker.
        style: `margin-left:${indentOf(node) * 1.5}em;padding-left:1.5em`,
        ...(todo ? { 'data-checked': node.attrs['checked'] ? 'true' : 'false' } : {}),
      }, 0],
      parseDOM: [{ tag: `[data-list='${options.listType}']` }],
    },
    inputRules,
    meta: { title: options.title, icon: 'list', keywords: options.keywords, group: 'lists' },
  });
}

export const bulletedList = defineListBlock({ type: 'bulleted-list', listType: 'bullet', title: 'Bulleted list', keywords: ['ul', 'bullet', 'unordered', 'list'] });
export const numberedList = defineListBlock({ type: 'numbered-list', listType: 'ordered', title: 'Numbered list', keywords: ['ol', 'number', 'ordered', 'list'] });
export const todoList = defineListBlock({ type: 'todo-list', listType: 'todo', title: 'To-do list', keywords: ['todo', 'task', 'checkbox', 'check'] });
