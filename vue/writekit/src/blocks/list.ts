import type { Attrs, Node } from '../model';
import type { AttrsSpec } from '../schema';
import { defineBlock } from '../registry';

type ListType = 'bullet' | 'ordered' | 'todo';

function indentOf(node: Node): number {
  return typeof node.attrs['indent'] === 'number' ? node.attrs['indent'] : 0;
}

/**
 * A pasted `<li>` belongs to the variant its nearest list decides: `<ul>` →
 * bullet, `<ol>` → ordered, either with a checkbox inside → to-do. Depth is
 * the number of enclosing lists, which is what the flat `indent` encodes.
 */
function listItemAttrs(el: HTMLElement, listType: ListType): Attrs | false {
  const checkbox = el.querySelector<HTMLInputElement>(':scope > input[type="checkbox"], :scope > * > input[type="checkbox"]');
  const list = el.closest('ul, ol');
  const actual: ListType = checkbox ? 'todo' : list?.tagName === 'OL' ? 'ordered' : 'bullet';

  if (actual !== listType)
    return false;

  let indent = -1;
  for (let node = list; node; node = node.parentElement?.closest('ul, ol') ?? null)
    indent++;

  return listType === 'todo'
    ? { indent: Math.max(indent, 0), checked: checkbox?.checked ?? false }
    : { indent: Math.max(indent, 0) };
}

/**
 * DRY factory for the three list variants. Lists are **flat-with-indent**: each
 * item is its own top-level text block carrying an `indent` attribute (and
 * `checked` for to-dos). Markers/numbering and indentation are presentation
 * (CSS), so the model stays a simple flat block list that maps cleanly to a CRDT.
 */
function defineListBlock(options: { type: string; listType: ListType; title: string; keywords: readonly string[]; description?: string }) {
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
      parseDOM: [
        { tag: `[data-list='${options.listType}']` },
        { tag: 'li', getAttrs: (el: HTMLElement) => listItemAttrs(el, options.listType) },
      ],
    },
    inputRules,
    meta: {
      title: options.title,
      icon: 'list',
      keywords: options.keywords,
      group: 'lists',
      ...(options.description !== undefined && { description: options.description }),
    },
  });
}

export const bulletedList = defineListBlock({ type: 'bulleted-list', listType: 'bullet', title: 'Bulleted list', keywords: ['ul', 'bullet', 'unordered', 'list'], description: 'Items marked with bullets; Tab indents.' });
export const numberedList = defineListBlock({ type: 'numbered-list', listType: 'ordered', title: 'Numbered list', keywords: ['ol', 'number', 'ordered', 'list'], description: 'Items numbered in order; Tab indents.' });
export const todoList = defineListBlock({ type: 'todo-list', listType: 'todo', title: 'To-do list', keywords: ['todo', 'task', 'checkbox', 'check'], description: 'Checkable tasks; Enter adds the next one.' });
