import { describe, expect, it } from 'vitest';
import { opId } from '@robonen/crdt';
import { createDoc, createNode } from '../../model';
import { createDefaultRegistry } from '../../preset';
import { DocumentCrdt } from '../native/document-crdt';

describe('documentCrdt.applyOp', () => {
  it('buffers (returns false for) a text-delete whose dependency is missing', () => {
    const registry = createDefaultRegistry();
    const doc = new DocumentCrdt(registry.schema);
    let counter = 0;
    doc.setIdFactory(() => opId('x', ++counter));

    for (const op of doc.seedFromDocument(createDoc([createNode('paragraph', { id: 'p', content: [{ text: 'ab', marks: [] }] })])))
      doc.applyOp(op);

    // Delete referencing a char id we've never seen → not ready (must buffer).
    expect(doc.applyOp({ id: opId('r', 1), kind: 'text-delete', blockId: 'p', charId: opId('r', 99) })).toBe(false);
    // Delete referencing a missing block → also not ready.
    expect(doc.applyOp({ id: opId('r', 2), kind: 'text-delete', blockId: 'gone', charId: opId('x', 1) })).toBe(false);
  });
});
