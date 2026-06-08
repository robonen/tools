import type { Attrs } from './attrs';
import type { Inline } from './inline';
import { inlineText } from './inline';
import { createId } from './id';

/**
 * A block's content. Three shapes, chosen by the block's schema:
 * - `Inline` for text blocks (paragraph, heading, list item),
 * - `readonly Node[]` for container blocks (reserved; no default block uses it),
 * - `null` for atom/void blocks (image, divider).
 */
export type Content = Inline | readonly Node[] | null;

/** A document block. `id` is stable across split/merge/move. */
export interface Node {
  readonly id: string;
  readonly type: string;
  readonly attrs: Attrs;
  readonly content: Content;
}

export interface CreateNodeOptions {
  readonly id?: string;
  readonly attrs?: Attrs;
  readonly content?: Content;
}

/** Construct a {@link Node}, generating an id when not supplied. */
export function createNode(type: string, options: CreateNodeOptions = {}): Node {
  return {
    id: options.id ?? createId(),
    type,
    attrs: options.attrs ?? {},
    content: options.content ?? null,
  };
}

/**
 * Best-effort runtime check for inline (text-block) content. The authoritative
 * answer comes from the schema; this is a convenience for model-level helpers.
 */
export function isInlineContent(content: Content): content is Inline {
  return Array.isArray(content) && (content.length === 0 || 'text' in (content[0] as object));
}

/** Inline content of a node, or `[]` when the node is not a text block. */
export function nodeInline(node: Node): Inline {
  return isInlineContent(node.content) ? node.content : [];
}

/** Plain text of a node, or `''` when the node has no inline content. */
export function nodeText(node: Node): string {
  return isInlineContent(node.content) ? inlineText(node.content) : '';
}

/** Return a copy of `node` with new content. */
export function withContent(node: Node, content: Content): Node {
  return { ...node, content };
}

/** Return a copy of `node` with new attrs. */
export function withAttrs(node: Node, attrs: Attrs): Node {
  return { ...node, attrs };
}

/** Return a copy of `node` with a new type (and optionally new attrs). */
export function withType(node: Node, type: string, attrs?: Attrs): Node {
  return { ...node, type, attrs: attrs ?? node.attrs };
}
