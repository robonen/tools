import type { Attrs, EditorDocument, Inline, Mark, Marks, Node, Position, Selection } from '../model';
import { blockById, caret, createId, firstBlock, inlineLength, nodeInline } from '../model';
import type { Schema } from '../schema';
import type { EditorState } from './editor-state';
import type { Step } from './step';
import { applyStep } from './step';

/**
 * A mutable builder that accumulates atomic {@link Step}s over a working copy of
 * the document. Each builder method applies its step immediately (so later
 * builders see prior effects) and records the exact inverse for undo. Dispatch
 * turns the finished transaction into a new {@link EditorState}.
 */
export class Transaction {
  readonly before: EditorState;
  readonly steps: Step[] = [];
  /** Inverse of each step, in application order (reversed when undoing). */
  readonly inverted: Step[] = [];
  readonly meta = new Map<string, unknown>();
  /** Working document after the steps applied so far. */
  doc: EditorDocument;
  /** Selection to apply after this transaction. */
  selection: Selection;
  /** `undefined` = leave stored marks to default handling; otherwise set them. */
  storedMarks: Marks | null | undefined = undefined;
  /** Id of the block created by the most recent {@link splitBlock}. */
  lastSplitId: string | undefined;

  private readonly schema: Schema;

  constructor(state: EditorState) {
    this.before = state;
    this.doc = state.doc;
    this.selection = state.selection;
    this.schema = state.schema;
  }

  /** Apply a raw step (also used by undo/redo to replay stored steps). */
  step(step: Step): this {
    const result = applyStep(this.doc, step, this.schema);
    this.doc = result.doc;
    this.steps.push(step);
    this.inverted.push(result.inverted);
    return this;
  }

  insertText(pos: Position, text: string, marks: Marks = []): this {
    return this.step({ type: 'insertInline', blockId: pos.blockId, offset: pos.offset, content: text ? [{ text, marks }] : [] });
  }

  insertInline(pos: Position, content: Inline): this {
    return this.step({ type: 'insertInline', blockId: pos.blockId, offset: pos.offset, content });
  }

  deleteText(blockId: string, from: number, to: number): this {
    return this.step({ type: 'deleteText', blockId, from, to });
  }

  replaceInline(blockId: string, from: number, to: number, content: Inline): this {
    return this.step({ type: 'replaceInline', blockId, from, to, content });
  }

  /** Replace a block's entire inline content (used by the input flush path). */
  setBlockContent(blockId: string, content: Inline): this {
    const block = blockById(this.doc, blockId);
    const length = block ? inlineLength(nodeInline(block)) : 0;
    return this.step({ type: 'replaceInline', blockId, from: 0, to: length, content });
  }

  addMark(blockId: string, from: number, to: number, mark: Mark): this {
    return this.step({ type: 'addMark', blockId, from, to, mark });
  }

  removeMark(blockId: string, from: number, to: number, mark: Mark): this {
    return this.step({ type: 'removeMark', blockId, from, to, mark });
  }

  /** Merge `attrs` into the block's existing attrs. */
  setAttrs(blockId: string, attrs: Attrs): this {
    const block = blockById(this.doc, blockId);
    return this.step({ type: 'setAttrs', blockId, attrs: { ...(block?.attrs ?? {}), ...attrs } });
  }

  /** Convert a block to another type, preserving its inline content. */
  setBlockType(blockId: string, type: string, attrs?: Attrs): this {
    return this.step({ type: 'setType', blockId, blockType: type, attrs: attrs ?? this.schema.defaultAttrs(type) });
  }

  splitBlock(pos: Position, newType?: string, newAttrs?: Attrs, newId: string = createId()): this {
    this.lastSplitId = newId;
    return this.step({ type: 'splitBlock', blockId: pos.blockId, offset: pos.offset, newId, newType, newAttrs });
  }

  mergeBlock(blockId: string, intoId: string): this {
    return this.step({ type: 'mergeBlock', blockId, intoId });
  }

  insertBlock(node: Node, index: number): this {
    return this.step({ type: 'insertBlock', node, index });
  }

  removeBlock(blockId: string): this {
    return this.step({ type: 'removeBlock', blockId });
  }

  moveBlock(blockId: string, toIndex: number): this {
    return this.step({ type: 'moveBlock', blockId, toIndex });
  }

  /** Replace the whole document (used to apply a remote CRDT snapshot). */
  setDoc(doc: EditorDocument): this {
    return this.step({ type: 'setDoc', doc });
  }

  setSelection(selection: Selection): this {
    this.selection = selection;
    return this;
  }

  setStoredMarks(marks: Marks | null): this {
    this.storedMarks = marks;
    return this;
  }

  setMeta(key: string, value: unknown): this {
    this.meta.set(key, value);
    return this;
  }

  getMeta(key: string): unknown {
    return this.meta.get(key);
  }
}

/** Start a transaction from the current editor state. */
export function createTransaction(state: EditorState): Transaction {
  return new Transaction(state);
}

function clampPoint(point: Position, doc: EditorDocument): Position | null {
  const block = blockById(doc, point.blockId);

  if (!block)
    return null;

  const length = inlineLength(nodeInline(block));
  return { blockId: point.blockId, offset: Math.max(0, Math.min(point.offset, length)) };
}

function clampSelection(selection: Selection, doc: EditorDocument): Selection {
  if (selection.kind === 'node')
    return selection;

  const anchor = clampPoint(selection.anchor, doc);
  const focus = clampPoint(selection.focus, doc);

  if (!anchor || !focus) {
    const first = firstBlock(doc);
    return first ? caret(first.id, 0) : selection;
  }

  return { kind: 'text', anchor, focus };
}

/**
 * Produce the next editor state from a transaction. Stored marks are kept when
 * explicitly set, cleared on any content change, and otherwise preserved.
 */
export function applyTransaction(state: EditorState, tr: Transaction): EditorState {
  const storedMarks = tr.storedMarks !== undefined
    ? tr.storedMarks
    : (tr.steps.length > 0 ? null : state.storedMarks);

  return {
    ...state,
    doc: tr.doc,
    selection: clampSelection(tr.selection, tr.doc),
    storedMarks,
  };
}
