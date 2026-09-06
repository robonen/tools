import type { Node } from './node';

/**
 * The writekit document: an ordered list of top-level blocks. Default blocks are
 * flat (lists use indent attributes, not nesting), so document helpers operate
 * on the top-level array.
 */
export interface WritekitDocument {
  readonly type: 'doc';
  readonly content: readonly Node[];
}

/** Construct a document from blocks. */
export function createDoc(content: readonly Node[] = []): WritekitDocument {
  return { type: 'doc', content };
}

/** Index of a block by id, or `-1` if absent. */
export function blockIndex(doc: WritekitDocument, id: string): number {
  return doc.content.findIndex(block => block.id === id);
}

/** A block and its index, or `null` if absent. */
export function findBlock(doc: WritekitDocument, id: string): { node: Node; index: number } | null {
  const index = blockIndex(doc, id);
  return index === -1 ? null : { node: doc.content[index]!, index };
}

/** A block by id, or `null`. */
export function blockById(doc: WritekitDocument, id: string): Node | null {
  return doc.content.find(block => block.id === id) ?? null;
}

/** The block before `id` in document order, or `null`. */
export function previousBlock(doc: WritekitDocument, id: string): Node | null {
  const index = blockIndex(doc, id);
  return index > 0 ? doc.content[index - 1]! : null;
}

/** The block after `id` in document order, or `null`. */
export function nextBlock(doc: WritekitDocument, id: string): Node | null {
  const index = blockIndex(doc, id);
  return index !== -1 && index < doc.content.length - 1 ? doc.content[index + 1]! : null;
}

/** First block, or `null` for an empty document. */
export function firstBlock(doc: WritekitDocument): Node | null {
  return doc.content[0] ?? null;
}

/** Last block, or `null` for an empty document. */
export function lastBlock(doc: WritekitDocument): Node | null {
  return doc.content[doc.content.length - 1] ?? null;
}

/**
 * The block order after moving `ids` (in document order) to sit before the
 * block currently at `toIndex`; `content.length` means the end. What a drop
 * and `moveBlocks` agree on, so the indicator never promises a move the
 * command would refuse.
 */
export function moveBefore(content: readonly Node[], ids: readonly string[], toIndex: number): readonly Node[] {
  const moving = content.filter(block => ids.includes(block.id));
  const rest = content.filter(block => !ids.includes(block.id));
  const boundary = content.slice(toIndex).find(block => !ids.includes(block.id));
  const at = boundary ? rest.findIndex(block => block.id === boundary.id) : rest.length;
  return [...rest.slice(0, at), ...moving, ...rest.slice(at)];
}

/** Return a copy of `doc` with a different block list. */
export function replaceBlocks(doc: WritekitDocument, content: readonly Node[]): WritekitDocument {
  return { ...doc, content };
}
