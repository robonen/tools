import type { MarkValue, OpId, VersionVector } from '@robonen/crdt';
import { LwwRegister, MarkStore, Rga, keyBetween, opIdEq, opIdToString } from '@robonen/crdt';
import type { Attrs, EditorDocument, Inline, InlineNode, Mark, Node, Selection } from '../../model';
import { createDoc, nodeSelection, normalizeInline, normalizeMarks, textSelection } from '../../model';
import type { Schema } from '../../schema';
import type { Step } from '../../state';
import type { SelectionAnchor } from '../types';

/**
 * The CRDT operation log entry. Each carries an op id for the oplog; structural
 * ops address blocks by their stable string id, text ops by character op ids.
 */
export type EditorOp
  = | { readonly id: OpId; readonly kind: 'block-insert'; readonly blockId: string; readonly blockType: string; readonly attrs: Attrs; readonly posKey: string; readonly isText: boolean }
    | { readonly id: OpId; readonly kind: 'block-remove'; readonly blockId: string }
    | { readonly id: OpId; readonly kind: 'block-move'; readonly blockId: string; readonly posKey: string }
    | { readonly id: OpId; readonly kind: 'block-attrs'; readonly blockId: string; readonly attrs: Attrs }
    | { readonly id: OpId; readonly kind: 'block-type'; readonly blockId: string; readonly blockType: string; readonly attrs: Attrs }
    | { readonly id: OpId; readonly kind: 'text-insert'; readonly blockId: string; readonly afterId: OpId | null; readonly ch: string }
    | { readonly id: OpId; readonly kind: 'text-delete'; readonly blockId: string; readonly charId: OpId }
    | { readonly id: OpId; readonly kind: 'mark-add'; readonly blockId: string; readonly markType: string; readonly value: MarkValue; readonly startId: OpId; readonly endId: OpId };

interface BlockState {
  present: LwwRegister<boolean>;
  posKey: LwwRegister<string>;
  type: LwwRegister<string>;
  attrs: LwwRegister<Attrs>;
  isText: boolean;
  rga: Rga<string>;
  marks: MarkStore;
}

function markToValue(mark: Mark): MarkValue {
  return mark.attrs && Object.keys(mark.attrs).length > 0 ? (mark.attrs as MarkValue) : true;
}

function valueToMark(type: string, value: MarkValue): Mark {
  return value && typeof value === 'object' ? { type, attrs: value as Attrs } : { type };
}

/**
 * The editor's document CRDT: a fractional-ordered set of blocks, each a text
 * RGA + a mark store (or an attribute-only atom). It translates the editor's
 * offset-based {@link Step}s into id-based CRDT ops ({@link translateStep}),
 * integrates ops from any replica ({@link applyOp}), and materializes an
 * {@link EditorDocument} ({@link toDocument}).
 */
export class DocumentCrdt {
  private readonly blocks = new Map<string, BlockState>();
  private nextId: () => OpId = () => { throw new Error('DocumentCrdt: id factory not set'); };

  constructor(private readonly schema: Schema) {}

  /** Wire the replica's id generator (called once by the provider). */
  setIdFactory(factory: () => OpId): void {
    this.nextId = factory;
  }

  // ---------------------------------------------------------------- integrate

  /** Apply one op (local or remote). Returns false if a causal dependency is missing. */
  applyOp(op: EditorOp): boolean {
    switch (op.kind) {
      case 'block-insert': {
        if (!this.blocks.has(op.blockId)) {
          this.blocks.set(op.blockId, {
            present: register(true, op.id),
            posKey: register(op.posKey, op.id),
            type: register(op.blockType, op.id),
            attrs: register(op.attrs, op.id),
            isText: op.isText,
            rga: new Rga<string>(),
            marks: new MarkStore(),
          });
        }
        else {
          // Re-activating a tombstoned block (e.g. undo of a removal): its RGA
          // and marks are intact, so we only restore presence/position/attrs.
          const block = this.blocks.get(op.blockId)!;
          block.present.set(true, op.id);
          block.posKey.set(op.posKey, op.id);
          block.type.set(op.blockType, op.id);
          block.attrs.set(op.attrs, op.id);
        }
        return true;
      }
      case 'block-remove': {
        const block = this.blocks.get(op.blockId);
        if (!block)
          return false;
        block.present.set(false, op.id);
        return true;
      }
      case 'block-move': {
        const block = this.blocks.get(op.blockId);
        if (!block)
          return false;
        block.posKey.set(op.posKey, op.id);
        return true;
      }
      case 'block-attrs': {
        const block = this.blocks.get(op.blockId);
        if (!block)
          return false;
        block.attrs.set(op.attrs, op.id);
        return true;
      }
      case 'block-type': {
        const block = this.blocks.get(op.blockId);
        if (!block)
          return false;
        block.type.set(op.blockType, op.id);
        block.attrs.set(op.attrs, op.id);
        return true;
      }
      case 'text-insert': {
        const block = this.blocks.get(op.blockId);
        if (!block)
          return false;
        return block.rga.integrateInsert(op.id, op.ch, op.afterId);
      }
      case 'text-delete': {
        const block = this.blocks.get(op.blockId);
        if (!block)
          return false;
        // Propagate false so the Replica buffers a delete that arrives before its
        // target insert (deleting an already-tombstoned id still returns true).
        return block.rga.integrateDelete(op.charId);
      }
      case 'mark-add': {
        const block = this.blocks.get(op.blockId);
        if (!block)
          return false;
        block.marks.add({ id: op.id, type: op.markType, value: op.value, start: op.startId, end: op.endId });
        return true;
      }
    }
  }

  // --------------------------------------------------------------- materialize

  toDocument(): EditorDocument {
    const content: Node[] = [];
    for (const blockId of this.orderedBlockIds()) {
      const block = this.blocks.get(blockId)!;
      content.push({
        id: blockId,
        type: block.type.get(),
        attrs: block.attrs.get(),
        content: block.isText ? this.materialize(block) : null,
      });
    }
    return createDoc(content);
  }

  private orderedBlockIds(): string[] {
    return [...this.blocks.entries()]
      .filter(([, block]) => block.present.get())
      .sort(([idA, a], [idB, b]) => {
        const ka = a.posKey.get();
        const kb = b.posKey.get();
        if (ka !== kb)
          return ka < kb ? -1 : 1;
        return idA < idB ? -1 : idA > idB ? 1 : 0;
      })
      .map(([id]) => id);
  }

  private materialize(block: BlockState): Inline {
    const nodes = block.rga.visible();
    const marksPerChar = block.marks.resolve(nodes.map(node => node.id));
    const runs: InlineNode[] = [];

    for (let i = 0; i < nodes.length; i++) {
      const marks = normalizeMarks([...marksPerChar[i]!].map(([type, value]) => valueToMark(type, value)));
      runs.push({ text: nodes[i]!.value, marks });
    }

    return normalizeInline(runs);
  }

  // ----------------------------------------------------------------- maintenance

  /**
   * Compact the CRDT: drop tombstoned characters and fully-removed blocks that
   * are covered by `stable`. Mark-span endpoints are preserved so formatting
   * survives. Call ONLY at quiescence — every replica fully synced, nothing in
   * flight — or a late op referencing dropped content can no longer integrate.
   */
  gc(stable: VersionVector): { blocks: number; chars: number } {
    let blocks = 0;
    let chars = 0;

    for (const [id, block] of this.blocks) {
      const removedAt = block.present.timestamp;
      if (!block.present.get() && removedAt && stable.has(removedAt)) {
        this.blocks.delete(id);
        blocks += 1;
        continue;
      }

      const keep = new Set<string>();
      for (const span of block.marks.all()) {
        keep.add(opIdToString(span.start));
        keep.add(opIdToString(span.end));
      }
      chars += block.rga.gc(stable, charId => keep.has(opIdToString(charId)));
    }

    return { blocks, chars };
  }

  // ------------------------------------------------------------------ awareness

  /** Whether a block currently exists and is visible. */
  hasBlock(blockId: string): boolean {
    return this.blocks.get(blockId)?.present.get() ?? false;
  }

  /** The char id a caret at `offset` sits after (null at block start) — a stable cursor anchor. */
  private anchorAt(blockId: string, offset: number): OpId | null {
    const block = this.blocks.get(blockId);
    return block?.isText ? block.rga.idAt(offset - 1) : null;
  }

  /** Resolve a char-id anchor back to an offset in the current state. */
  private offsetOf(blockId: string, afterCharId: OpId | null): number {
    const block = this.blocks.get(blockId);
    if (!block?.isText)
      return 0;
    if (afterCharId === null)
      return 0;
    const visible = block.rga.visible();
    const index = visible.findIndex(node => opIdEq(node.id, afterCharId));
    return index === -1 ? visible.length : index + 1;
  }

  /** Convert a model selection into a char-id anchor (for presence broadcast). */
  toAnchor(selection: Selection): SelectionAnchor {
    if (selection.kind === 'node')
      return { kind: 'node', ids: selection.ids };
    return {
      kind: 'text',
      anchor: { blockId: selection.anchor.blockId, afterCharId: this.anchorAt(selection.anchor.blockId, selection.anchor.offset) },
      focus: { blockId: selection.focus.blockId, afterCharId: this.anchorAt(selection.focus.blockId, selection.focus.offset) },
    };
  }

  /** Resolve an anchor back into a model selection against the current document. */
  resolveAnchor(anchor: SelectionAnchor | null): Selection | null {
    if (!anchor)
      return null;
    if (anchor.kind === 'node')
      return anchor.ids.length > 0 ? nodeSelection(anchor.ids) : null;
    if (!this.hasBlock(anchor.anchor.blockId) || !this.hasBlock(anchor.focus.blockId))
      return null;
    return textSelection(
      { blockId: anchor.anchor.blockId, offset: this.offsetOf(anchor.anchor.blockId, anchor.anchor.afterCharId) },
      { blockId: anchor.focus.blockId, offset: this.offsetOf(anchor.focus.blockId, anchor.focus.afterCharId) },
    );
  }

  // ----------------------------------------------------------------- translate

  /** Generate the ops for a local step, reading current state for ids/positions. */
  translateStep(step: Step): EditorOp[] {
    switch (step.type) {
      case 'insertInline':
        return this.insertInlineOps(step.blockId, step.offset, step.content);
      case 'deleteText':
        return this.deleteTextOps(step.blockId, step.from, step.to);
      case 'replaceInline':
        return [...this.deleteTextOps(step.blockId, step.from, step.to), ...this.insertInlineOps(step.blockId, step.from, step.content)];
      case 'addMark':
        return this.markOps(step.blockId, step.from, step.to, step.mark.type, markToValue(step.mark));
      case 'removeMark':
        return this.markOps(step.blockId, step.from, step.to, step.mark.type, null);
      case 'setAttrs':
        return this.blocks.has(step.blockId) ? [{ id: this.nextId(), kind: 'block-attrs', blockId: step.blockId, attrs: step.attrs }] : [];
      case 'setType':
        return this.blocks.has(step.blockId) ? [{ id: this.nextId(), kind: 'block-type', blockId: step.blockId, blockType: step.blockType, attrs: step.attrs }] : [];
      case 'insertBlock':
        return this.insertBlockOps(step.node, step.index);
      case 'removeBlock':
        return this.blocks.has(step.blockId) ? [{ id: this.nextId(), kind: 'block-remove', blockId: step.blockId }] : [];
      case 'moveBlock':
        return this.moveOps(step.blockId, step.toIndex);
      case 'splitBlock':
        return this.splitOps(step.blockId, step.offset, step.newId, step.newType, step.newAttrs);
      case 'mergeBlock':
        return this.mergeOps(step.blockId, step.intoId);
      case 'setDoc':
        return []; // whole-doc replace is local-only (e.g. applying a remote snapshot); not re-emitted
    }
  }

  /** Ops to seed the CRDT from an initial document. */
  seedFromDocument(doc: EditorDocument): EditorOp[] {
    const ops: EditorOp[] = [];
    let prevKey: string | null = null;

    for (const node of doc.content) {
      const posKey = keyBetween(prevKey, null);
      prevKey = posKey;
      ops.push(...this.blockOps(node, posKey));
    }

    return ops;
  }

  // ------------------------------------------------------------------ op builders

  /** Ops for an `insertBlock` step: reactivate if the block already exists (undo), else create. */
  private insertBlockOps(node: Node, index: number): EditorOp[] {
    const posKey = this.posKeyForIndex(index);

    if (this.blocks.has(node.id)) {
      const isText = this.schema.nodeSpec(node.type)?.content.kind === 'text';
      return [{ id: this.nextId(), kind: 'block-insert', blockId: node.id, blockType: node.type, attrs: node.attrs, posKey, isText }];
    }

    return this.blockOps(node, posKey);
  }

  private blockOps(node: Node, posKey: string): EditorOp[] {
    const isText = this.schema.nodeSpec(node.type)?.content.kind === 'text';
    const ops: EditorOp[] = [{
      id: this.nextId(),
      kind: 'block-insert',
      blockId: node.id,
      blockType: node.type,
      attrs: node.attrs,
      posKey,
      isText,
    }];

    if (isText && Array.isArray(node.content))
      ops.push(...this.inlineOps(node.id, node.content as Inline, null));

    return ops;
  }

  /** Insert inline `content` after the char at `afterId` (null = block start). */
  private inlineOps(blockId: string, content: Inline, afterId: OpId | null): EditorOp[] {
    const ops: EditorOp[] = [];
    let after = afterId;

    for (const run of content) {
      const charIds: OpId[] = [];
      // Iterate UTF-16 code units (not code points) to match the editor's
      // offset space — one RGA node per unit keeps offsets aligned for astral chars.
      for (let i = 0; i < run.text.length; i++) {
        const id = this.nextId();
        ops.push({ id, kind: 'text-insert', blockId, afterId: after, ch: run.text[i]! });
        after = id;
        charIds.push(id);
      }

      if (charIds.length > 0) {
        for (const mark of run.marks)
          ops.push({ id: this.nextId(), kind: 'mark-add', blockId, markType: mark.type, value: markToValue(mark), startId: charIds[0]!, endId: charIds[charIds.length - 1]! });
      }
    }

    return ops;
  }

  private insertInlineOps(blockId: string, offset: number, content: Inline): EditorOp[] {
    const block = this.blocks.get(blockId);
    if (!block || !block.isText)
      return [];
    return this.inlineOps(blockId, content, block.rga.idAt(offset - 1));
  }

  private deleteTextOps(blockId: string, from: number, to: number): EditorOp[] {
    const block = this.blocks.get(blockId);
    if (!block || !block.isText)
      return [];
    return block.rga.visible().slice(from, to)
      .map(node => ({ id: this.nextId(), kind: 'text-delete' as const, blockId, charId: node.id }));
  }

  private markOps(blockId: string, from: number, to: number, markType: string, value: MarkValue): EditorOp[] {
    const block = this.blocks.get(blockId);
    if (!block || !block.isText || from >= to)
      return [];

    const visible = block.rga.visible();
    const start = visible[from]?.id;
    const end = visible[to - 1]?.id;
    if (!start || !end)
      return [];

    return [{ id: this.nextId(), kind: 'mark-add', blockId, markType, value, startId: start, endId: end }];
  }

  private posKeyForIndex(index: number): string {
    const order = this.orderedBlockIds();
    const before = index > 0 ? this.blocks.get(order[index - 1]!)?.posKey.get() ?? null : null;
    const after = index < order.length ? this.blocks.get(order[index]!)?.posKey.get() ?? null : null;
    return keyBetween(before, after);
  }

  private moveOps(blockId: string, toIndex: number): EditorOp[] {
    if (!this.blocks.has(blockId))
      return [];

    const order = this.orderedBlockIds().filter(id => id !== blockId);
    const before = toIndex > 0 ? this.blocks.get(order[toIndex - 1]!)?.posKey.get() ?? null : null;
    const after = toIndex < order.length ? this.blocks.get(order[toIndex]!)?.posKey.get() ?? null : null;
    return [{ id: this.nextId(), kind: 'block-move', blockId, posKey: keyBetween(before, after) }];
  }

  private splitOps(blockId: string, offset: number, newId: string, newType?: string, newAttrs?: Attrs): EditorOp[] {
    const block = this.blocks.get(blockId);
    if (!block || !block.isText)
      return [];

    const order = this.orderedBlockIds();
    const index = order.indexOf(blockId);
    const nextKey = index >= 0 && index + 1 < order.length ? this.blocks.get(order[index + 1]!)!.posKey.get() : null;
    const posKey = keyBetween(block.posKey.get(), nextKey);

    // Undo of a merge: the split's target block already exists (tombstoned) with
    // its original content intact. Reactivate it and drop the merged-in tail from
    // the source instead of recreating content (which would duplicate it).
    const existing = this.blocks.get(newId);
    if (existing) {
      const reactivate: EditorOp[] = [{ id: this.nextId(), kind: 'block-insert', blockId: newId, blockType: existing.type.get(), attrs: existing.attrs.get(), posKey, isText: existing.isText }];
      for (const node of block.rga.visible().slice(offset))
        reactivate.push({ id: this.nextId(), kind: 'text-delete', blockId, charId: node.id });
      return reactivate;
    }

    const type = newType ?? block.type.get();
    const attrs = newAttrs ?? (newType ? this.schema.defaultAttrs(newType) : block.attrs.get());
    const isText = this.schema.nodeSpec(type)?.content.kind === 'text';

    const ops: EditorOp[] = [{ id: this.nextId(), kind: 'block-insert', blockId: newId, blockType: type, attrs, posKey, isText }];

    // Re-create the tail (offset..end) in the new block, then tombstone it in the old.
    const tail = block.rga.visible().slice(offset);
    const marksPerChar = block.marks.resolve(block.rga.visible().map(node => node.id));
    let after: OpId | null = null;

    for (let k = 0; k < tail.length; k++) {
      const id = this.nextId();
      ops.push({ id, kind: 'text-insert', blockId: newId, afterId: after, ch: tail[k]!.value });
      after = id;
      for (const [markType, value] of marksPerChar[offset + k]!)
        ops.push({ id: this.nextId(), kind: 'mark-add', blockId: newId, markType, value, startId: id, endId: id });
    }

    for (const node of tail)
      ops.push({ id: this.nextId(), kind: 'text-delete', blockId, charId: node.id });

    return ops;
  }

  private mergeOps(blockId: string, intoId: string): EditorOp[] {
    const source = this.blocks.get(blockId);
    const target = this.blocks.get(intoId);
    if (!source || !target || !source.isText || !target.isText)
      return [];

    const ops: EditorOp[] = [];
    const sourceChars = source.rga.visible();
    const marksPerChar = source.marks.resolve(sourceChars.map(node => node.id));
    let after = target.rga.idAt(target.rga.length - 1);

    for (let k = 0; k < sourceChars.length; k++) {
      const id = this.nextId();
      ops.push({ id, kind: 'text-insert', blockId: intoId, afterId: after, ch: sourceChars[k]!.value });
      after = id;
      for (const [markType, value] of marksPerChar[k]!)
        ops.push({ id: this.nextId(), kind: 'mark-add', blockId: intoId, markType, value, startId: id, endId: id });
    }

    ops.push({ id: this.nextId(), kind: 'block-remove', blockId });
    return ops;
  }
}

function register<T>(value: T, id: OpId): LwwRegister<T> {
  const reg = new LwwRegister<T>(value);
  reg.set(value, id);
  return reg;
}
