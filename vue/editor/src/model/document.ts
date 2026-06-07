import type { Node } from './node';

/**
 * The editor document: an ordered list of top-level blocks. Default blocks are
 * flat (lists use indent attributes, not nesting), so document helpers operate
 * on the top-level array.
 */
export interface EditorDocument {
  readonly type: 'doc';
  readonly content: readonly Node[];
}

/** Construct a document from blocks. */
export function createDoc(content: readonly Node[] = []): EditorDocument {
  return { type: 'doc', content };
}

/** Index of a block by id, or `-1` if absent. */
export function blockIndex(doc: EditorDocument, id: string): number {
  return doc.content.findIndex(block => block.id === id);
}

/** A block and its index, or `null` if absent. */
export function findBlock(doc: EditorDocument, id: string): { node: Node; index: number } | null {
  const index = blockIndex(doc, id);
  return index === -1 ? null : { node: doc.content[index]!, index };
}

/** A block by id, or `null`. */
export function blockById(doc: EditorDocument, id: string): Node | null {
  return doc.content.find(block => block.id === id) ?? null;
}

/** The block before `id` in document order, or `null`. */
export function previousBlock(doc: EditorDocument, id: string): Node | null {
  const index = blockIndex(doc, id);
  return index > 0 ? doc.content[index - 1]! : null;
}

/** The block after `id` in document order, or `null`. */
export function nextBlock(doc: EditorDocument, id: string): Node | null {
  const index = blockIndex(doc, id);
  return index !== -1 && index < doc.content.length - 1 ? doc.content[index + 1]! : null;
}

/** First block, or `null` for an empty document. */
export function firstBlock(doc: EditorDocument): Node | null {
  return doc.content[0] ?? null;
}

/** Last block, or `null` for an empty document. */
export function lastBlock(doc: EditorDocument): Node | null {
  return doc.content[doc.content.length - 1] ?? null;
}

/** Return a copy of `doc` with a different block list. */
export function replaceBlocks(doc: EditorDocument, content: readonly Node[]): EditorDocument {
  return { ...doc, content };
}
