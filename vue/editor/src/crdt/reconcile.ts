import type { Content, EditorDocument, Node } from '../model';
import { attrsEq, createDoc, isInlineContent, marksEq } from '../model';

function contentEq(a: Content, b: Content): boolean {
  if (a === b)
    return true;
  if (a === null || b === null)
    return false;

  if (isInlineContent(a) && isInlineContent(b)) {
    if (a.length !== b.length)
      return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i]!.text !== b[i]!.text || !marksEq(a[i]!.marks, b[i]!.marks))
        return false;
    }
    return true;
  }

  return false; // container Node[] — unused in the flat model; treat as changed
}

function nodeEq(a: Node, b: Node): boolean {
  return a.id === b.id && a.type === b.type && attrsEq(a.attrs, b.attrs) && contentEq(a.content, b.content);
}

/**
 * Build a document equal to `next` but reusing block-node identities from `prev`
 * wherever a block is deep-equal — so applying a remote change repaints only the
 * blocks that actually changed (others keep their reference, and the local caret
 * in them is undisturbed). Returns `prev` unchanged when nothing differs.
 */
export function reconcileDoc(prev: EditorDocument, next: EditorDocument): EditorDocument {
  const prevById = new Map(prev.content.map(node => [node.id, node]));
  let changed = prev.content.length !== next.content.length;

  const content = next.content.map((node, index) => {
    const before = prevById.get(node.id);
    if (before && nodeEq(before, node)) {
      if (prev.content[index]?.id !== node.id)
        changed = true; // same block, new position
      return before; // reuse identity → no repaint
    }
    changed = true;
    return node;
  });

  return changed ? createDoc(content) : prev;
}
