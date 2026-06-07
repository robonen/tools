import { describe, expect, it } from 'vitest';
import { createDoc, createNode, nodeText } from '../../model';
import { createDefaultRegistry } from '../../preset';
import { applyStep } from '../step';

const schema = createDefaultRegistry().schema;

function para(id: string, text: string) {
  return createNode('paragraph', { id, content: text ? [{ text, marks: [] }] : [] });
}

describe('applyStep', () => {
  it('inserts and inverts to the original', () => {
    const doc = createDoc([para('a', 'hi')]);
    const inserted = applyStep(doc, { type: 'insertInline', blockId: 'a', offset: 2, content: [{ text: '!', marks: [] }] }, schema);
    expect(nodeText(inserted.doc.content[0]!)).toBe('hi!');

    const back = applyStep(inserted.doc, inserted.inverted, schema);
    expect(nodeText(back.doc.content[0]!)).toBe('hi');
  });

  it('splits a block, and its inverse merges back', () => {
    const doc = createDoc([para('a', 'hello')]);
    const split = applyStep(doc, { type: 'splitBlock', blockId: 'a', offset: 2, newId: 'b' }, schema);
    expect(split.doc.content.map(block => nodeText(block))).toEqual(['he', 'llo']);

    const merged = applyStep(split.doc, split.inverted, schema);
    expect(merged.doc.content.map(block => nodeText(block))).toEqual(['hello']);
  });

  it('moves a block, and its inverse restores order', () => {
    const doc = createDoc([para('a', '1'), para('b', '2'), para('c', '3')]);
    const moved = applyStep(doc, { type: 'moveBlock', blockId: 'a', toIndex: 2 }, schema);
    expect(moved.doc.content.map(block => block.id)).toEqual(['b', 'c', 'a']);

    const back = applyStep(moved.doc, moved.inverted, schema);
    expect(back.doc.content.map(block => block.id)).toEqual(['a', 'b', 'c']);
  });

  it('adds a mark and inverts to the prior inline state', () => {
    const doc = createDoc([para('a', 'abc')]);
    const marked = applyStep(doc, { type: 'addMark', blockId: 'a', from: 0, to: 3, mark: { type: 'bold' } }, schema);
    expect(marked.doc.content[0]!.content).toEqual([{ text: 'abc', marks: [{ type: 'bold' }] }]);

    const back = applyStep(marked.doc, marked.inverted, schema);
    expect(back.doc.content[0]!.content).toEqual([{ text: 'abc', marks: [] }]);
  });
});
