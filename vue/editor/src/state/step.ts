import type { Attrs, EditorDocument, Inline, Mark, Node } from '../model';
import {
  addMarkInline,
  blockById,
  blockIndex,
  createNode,
  deleteTextInline,
  findBlock,
  inlineLength,
  insertInline,
  nodeInline,
  normalizeInline,
  removeMarkInline,
  replaceBlocks,
  replaceInline,
  sliceInline,
  withAttrs,
  withContent,
  withType,
} from '../model';
import type { Schema } from '../schema';
import { marksAllowed } from '../schema';

/**
 * The atomic, invertible, serializable unit of change. Steps are the contract
 * shared by the undo history (each carries its exact inverse) and the CRDT
 * adapter (each maps to a CRDT operation). Keeping the set small (~12) means a
 * new block type never needs a new step.
 */
export type Step
  = | { readonly type: 'insertInline'; readonly blockId: string; readonly offset: number; readonly content: Inline }
    | { readonly type: 'deleteText'; readonly blockId: string; readonly from: number; readonly to: number }
    | { readonly type: 'replaceInline'; readonly blockId: string; readonly from: number; readonly to: number; readonly content: Inline }
    | { readonly type: 'addMark'; readonly blockId: string; readonly from: number; readonly to: number; readonly mark: Mark }
    | { readonly type: 'removeMark'; readonly blockId: string; readonly from: number; readonly to: number; readonly mark: Mark }
    | { readonly type: 'setAttrs'; readonly blockId: string; readonly attrs: Attrs }
    | { readonly type: 'setType'; readonly blockId: string; readonly blockType: string; readonly attrs: Attrs }
    | { readonly type: 'splitBlock'; readonly blockId: string; readonly offset: number; readonly newId: string; readonly newType?: string; readonly newAttrs?: Attrs }
    | { readonly type: 'mergeBlock'; readonly blockId: string; readonly intoId: string }
    | { readonly type: 'insertBlock'; readonly node: Node; readonly index: number }
    | { readonly type: 'removeBlock'; readonly blockId: string }
    | { readonly type: 'moveBlock'; readonly blockId: string; readonly toIndex: number }
    | { readonly type: 'setDoc'; readonly doc: EditorDocument };

export interface StepResult {
  readonly doc: EditorDocument;
  readonly inverted: Step;
}

function mapBlock(doc: EditorDocument, blockId: string, fn: (node: Node) => Node): EditorDocument {
  return replaceBlocks(doc, doc.content.map(block => (block.id === blockId ? fn(block) : block)));
}

/**
 * Apply a single step to a document, returning the next document and the exact
 * inverse step (so undo is correct by construction). Pure: never mutates input.
 * If the addressed block is missing the step is a no-op (defends against remote
 * steps referencing concurrently-removed blocks).
 */
export function applyStep(doc: EditorDocument, step: Step, schema: Schema): StepResult {
  switch (step.type) {
    case 'insertInline': {
      const block = blockById(doc, step.blockId);
      if (!block)
        return { doc, inverted: step };

      const next = normalizeInline(insertInline(nodeInline(block), step.offset, step.content));
      return {
        doc: mapBlock(doc, step.blockId, b => withContent(b, next)),
        inverted: { type: 'deleteText', blockId: step.blockId, from: step.offset, to: step.offset + inlineLength(step.content) },
      };
    }

    case 'deleteText': {
      const block = blockById(doc, step.blockId);
      if (!block)
        return { doc, inverted: step };

      const inline = nodeInline(block);
      const removed = sliceInline(inline, step.from, step.to);
      return {
        doc: mapBlock(doc, step.blockId, b => withContent(b, normalizeInline(deleteTextInline(inline, step.from, step.to)))),
        inverted: { type: 'insertInline', blockId: step.blockId, offset: step.from, content: removed },
      };
    }

    case 'replaceInline': {
      const block = blockById(doc, step.blockId);
      if (!block)
        return { doc, inverted: step };

      const inline = nodeInline(block);
      const removed = sliceInline(inline, step.from, step.to);
      return {
        doc: mapBlock(doc, step.blockId, b => withContent(b, normalizeInline(replaceInline(inline, step.from, step.to, step.content)))),
        inverted: { type: 'replaceInline', blockId: step.blockId, from: step.from, to: step.from + inlineLength(step.content), content: removed },
      };
    }

    case 'addMark':
    case 'removeMark': {
      const block = blockById(doc, step.blockId);
      if (!block)
        return { doc, inverted: step };

      const inline = nodeInline(block);
      const removed = sliceInline(inline, step.from, step.to); // exact prior state of the range
      const next = step.type === 'addMark'
        ? addMarkInline(inline, step.from, step.to, step.mark)
        : removeMarkInline(inline, step.from, step.to, step.mark.type);
      return {
        doc: mapBlock(doc, step.blockId, b => withContent(b, normalizeInline(next))),
        // Length is unchanged, so restoring the saved slice over [from, to) is an exact inverse.
        inverted: { type: 'replaceInline', blockId: step.blockId, from: step.from, to: step.to, content: removed },
      };
    }

    case 'setAttrs': {
      const block = blockById(doc, step.blockId);
      if (!block)
        return { doc, inverted: step };

      return {
        doc: mapBlock(doc, step.blockId, b => withAttrs(b, step.attrs)),
        inverted: { type: 'setAttrs', blockId: step.blockId, attrs: block.attrs },
      };
    }

    case 'setType': {
      const block = blockById(doc, step.blockId);
      if (!block)
        return { doc, inverted: step };

      return {
        doc: mapBlock(doc, step.blockId, b => withType(b, step.blockType, step.attrs)),
        inverted: { type: 'setType', blockId: step.blockId, blockType: block.type, attrs: block.attrs },
      };
    }

    case 'splitBlock': {
      const found = findBlock(doc, step.blockId);
      if (!found)
        return { doc, inverted: step };

      const { node, index } = found;
      const inline = nodeInline(node);
      const head = normalizeInline(sliceInline(inline, 0, step.offset));
      const tail = normalizeInline(sliceInline(inline, step.offset, inlineLength(inline)));
      const newAttrs = step.newAttrs ?? (step.newType ? schema.defaultAttrs(step.newType) : node.attrs);
      const newNode = createNode(step.newType ?? node.type, { id: step.newId, attrs: newAttrs, content: tail });
      const content = [...doc.content.slice(0, index), withContent(node, head), newNode, ...doc.content.slice(index + 1)];
      return {
        doc: replaceBlocks(doc, content),
        inverted: { type: 'mergeBlock', blockId: step.newId, intoId: step.blockId },
      };
    }

    case 'mergeBlock': {
      const source = findBlock(doc, step.blockId);
      const target = findBlock(doc, step.intoId);
      if (!source || !target)
        return { doc, inverted: step };

      const targetInline = nodeInline(target.node);
      const splitOffset = inlineLength(targetInline);
      // Drop source marks the target block disallows (e.g. merging styled text
      // into a code-block must not smuggle in marks past `marks: 'none'`).
      const targetSpec = schema.nodeSpec(target.node.type);
      const sourceInline = targetSpec
        ? nodeInline(source.node).map(run => ({ text: run.text, marks: run.marks.filter(m => marksAllowed(targetSpec, m.type)) }))
        : nodeInline(source.node);
      const mergedInline = normalizeInline([...targetInline, ...sourceInline]);
      const content = doc.content
        .map(block => (block.id === step.intoId ? withContent(target.node, mergedInline) : block))
        .filter(block => block.id !== step.blockId);
      return {
        doc: replaceBlocks(doc, content),
        inverted: { type: 'splitBlock', blockId: step.intoId, offset: splitOffset, newId: source.node.id, newType: source.node.type, newAttrs: source.node.attrs },
      };
    }

    case 'insertBlock': {
      const index = Math.max(0, Math.min(step.index, doc.content.length));
      const content = [...doc.content.slice(0, index), step.node, ...doc.content.slice(index)];
      return {
        doc: replaceBlocks(doc, content),
        inverted: { type: 'removeBlock', blockId: step.node.id },
      };
    }

    case 'removeBlock': {
      const found = findBlock(doc, step.blockId);
      if (!found)
        return { doc, inverted: step };

      return {
        doc: replaceBlocks(doc, doc.content.filter(block => block.id !== step.blockId)),
        inverted: { type: 'insertBlock', node: found.node, index: found.index },
      };
    }

    case 'moveBlock': {
      const from = blockIndex(doc, step.blockId);
      if (from === -1)
        return { doc, inverted: step };

      const arr = [...doc.content];
      const [moved] = arr.splice(from, 1);
      const to = Math.max(0, Math.min(step.toIndex, arr.length));
      arr.splice(to, 0, moved!);
      return {
        doc: replaceBlocks(doc, arr),
        inverted: { type: 'moveBlock', blockId: step.blockId, toIndex: from },
      };
    }

    case 'setDoc': {
      // Replace the whole document (used to apply a remote CRDT snapshot).
      return {
        doc: step.doc,
        inverted: { type: 'setDoc', doc },
      };
    }
  }
}
