import { describe, expect, it } from 'vitest';
import type { Node, Selection } from '../../model';
import { caret, createDoc, createNode, createSlice, nodeInline, nodeSelection, nodeText, sliceFromSelection, textSelection, withFreshIds } from '../../model';
import { createDefaultRegistry } from '../../preset';
import { createWritekit, createWritekitState } from '../../state';
import { convertBlock, deleteSelection, duplicateBlock, insertBlockBeside, moveBlocks, replaceSelection } from '..';

function para(id: string, text: string, type = 'paragraph'): Node {
  return createNode(type, { id, content: text ? [{ text, marks: [] }] : [] });
}

function writekitWith(blocks: Node[], selection?: Selection) {
  const registry = createDefaultRegistry();
  return createWritekit({ state: createWritekitState({ registry, doc: createDoc(blocks), selection }) });
}

const texts = (w: ReturnType<typeof writekitWith>) => w.state.doc.content.map(block => nodeText(block));
const types = (w: ReturnType<typeof writekitWith>) => w.state.doc.content.map(block => block.type);

describe('replaceSelection — inline fragments', () => {
  it('inserts runs at the caret and lands after them', () => {
    const w = writekitWith([para('a', 'hello world')], caret('a', 5));
    expect(w.command(replaceSelection(createSlice([para('x', ' big')], true, true)))).toBe(true);
    expect(texts(w)).toEqual(['hello big world']);
    expect(w.state.selection).toEqual(caret('a', 9));
  });

  it('keeps marks the target allows and drops the ones it forbids', () => {
    const bold = createNode('paragraph', { id: 'x', content: [{ text: 'B', marks: [{ type: 'bold' }] }] });

    const prose = writekitWith([para('a', 'ab')], caret('a', 1));
    prose.command(replaceSelection(createSlice([bold], true, true)));
    expect(nodeInline(prose.state.doc.content[0]!)).toEqual([
      { text: 'a', marks: [] }, { text: 'B', marks: [{ type: 'bold' }] }, { text: 'b', marks: [] },
    ]);

    const code = writekitWith([para('c', 'ab', 'code-block')], caret('c', 1));
    code.command(replaceSelection(createSlice([bold], true, true)));
    expect(nodeInline(code.state.doc.content[0]!)).toEqual([{ text: 'aBb', marks: [] }]);
  });

  it('flattens a block fragment to lines inside a code block', () => {
    const w = writekitWith([para('c', 'x', 'code-block')], caret('c', 1));
    w.command(replaceSelection(createSlice([para('1', 'one'), para('2', 'two')], true, true)));
    expect(texts(w)).toEqual(['xone\ntwo']);
    expect(types(w)).toEqual(['code-block']);
  });

  it('is one undo entry even when it replaced a cross-block range', () => {
    const w = writekitWith(
      [para('a', 'hello'), para('b', 'mid'), para('c', 'world')],
      textSelection({ blockId: 'a', offset: 2 }, { blockId: 'c', offset: 1 }),
    );
    w.command(replaceSelection(createSlice([para('x', 'X')], true, true)));
    expect(texts(w)).toEqual(['heXorld']);

    expect(w.undo()).toBe(true);
    expect(texts(w)).toEqual(['hello', 'mid', 'world']);
  });

  it('refuses an empty fragment without touching the selection', () => {
    const w = writekitWith([para('a', 'ab')], textSelection({ blockId: 'a', offset: 0 }, { blockId: 'a', offset: 1 }));
    expect(w.command(replaceSelection(createSlice([])))).toBe(false);
    expect(texts(w)).toEqual(['ab']);
  });
});

describe('replaceSelection — block fragments', () => {
  const three = () => [para('1', 'A'), para('2', 'B'), para('3', 'C')];

  it('splits the caret block and merges the open ends into head and tail', () => {
    const w = writekitWith([para('a', 'helloworld')], caret('a', 5));
    w.command(replaceSelection(createSlice(three(), true, true)));
    expect(texts(w)).toEqual(['helloA', 'B', 'Cworld']);
    expect(w.state.selection).toEqual(caret(w.state.doc.content[2]!.id, 1));
    expect(new Set(w.state.doc.content.map(block => block.id)).size).toBe(3);
  });

  it('an empty line adopts the type of what merges into it', () => {
    const heading = createNode('heading', { id: 'h', attrs: { level: 2 }, content: [{ text: 'Title', marks: [] }] });
    const w = writekitWith([para('a', '')], caret('a', 0));
    w.command(replaceSelection(createSlice([heading, para('2', 'body'), para('q', 'quote', 'blockquote')], true, true)));
    expect(types(w)).toEqual(['heading', 'paragraph', 'blockquote']);
    expect(texts(w)).toEqual(['Title', 'body', 'quote']);
    expect(w.state.doc.content[0]!.attrs).toEqual({ level: 2 });
    expect(w.state.doc.content[0]!.id).toBe('a'); // the line itself became the heading
  });

  it('whole blocks replace an empty line instead of leaving it behind', () => {
    const w = writekitWith([para('a', 'before'), para('b', ''), para('c', 'after')], caret('b', 0));
    w.command(replaceSelection(createSlice(three())));
    expect(texts(w)).toEqual(['before', 'A', 'B', 'C', 'after']);
    expect(w.state.selection).toEqual(caret(w.state.doc.content[3]!.id, 1));
  });

  it('keeps head and tail when whole blocks land mid-paragraph', () => {
    const w = writekitWith([para('a', 'helloworld')], caret('a', 5));
    w.command(replaceSelection(createSlice([createNode('divider', { id: 'd' })])));
    expect(types(w)).toEqual(['paragraph', 'divider', 'paragraph']);
    expect(texts(w)).toEqual(['hello', '', 'world']);
    expect(w.state.selection).toEqual(caret(w.state.doc.content[2]!.id, 0));
  });

  it('an atom pasted at the end of a line is selected, with no empty line after it', () => {
    const w = writekitWith([para('a', 'hello')], caret('a', 5));
    w.command(replaceSelection(createSlice([createNode('divider', { id: 'd' })])));
    expect(types(w)).toEqual(['paragraph', 'divider']);
    expect(w.state.selection).toEqual(nodeSelection([w.state.doc.content[1]!.id]));
  });

  it('replaces a node selection with the fragment at its place', () => {
    const w = writekitWith([para('a', 'x'), createNode('divider', { id: 'd' }), para('b', 'y')], nodeSelection(['d']));
    w.command(replaceSelection(createSlice([para('1', 'A'), para('2', 'B')])));
    expect(texts(w)).toEqual(['x', 'A', 'B', 'y']);
  });

  it('never reuses the ids it was handed', () => {
    const w = writekitWith([para('a', 'x')], caret('a', 1));
    w.command(replaceSelection(createSlice([para('a', 'A'), para('a', 'B')])));
    const ids = w.state.doc.content.map(block => block.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('drops blocks the registry does not know', () => {
    const w = writekitWith([para('a', 'x')], caret('a', 1));
    w.command(replaceSelection(createSlice([createNode('mystery', { id: 'm' }), para('1', 'A')])));
    expect(types(w)).toEqual(['paragraph', 'paragraph']);
    expect(texts(w)).toEqual(['x', 'A']);
  });
});

describe('deleteSelection over the shared builder', () => {
  it('is a no-op on a collapsed caret', () => {
    const w = writekitWith([para('a', 'ab')], caret('a', 1));
    expect(w.command(deleteSelection)).toBe(false);
  });

  it('never leaves the document empty', () => {
    const w = writekitWith([para('a', 'ab'), para('b', 'cd')], nodeSelection(['a', 'b']));
    expect(w.command(deleteSelection)).toBe(true);
    expect(types(w)).toEqual(['paragraph']);
    expect(texts(w)).toEqual(['']);
  });

  it('lands at the end of the block before removed ones', () => {
    const w = writekitWith([para('a', 'ab'), createNode('divider', { id: 'd' })], nodeSelection(['d']));
    w.command(deleteSelection);
    expect(w.state.selection).toEqual(caret('a', 2));
  });
});

describe('sliceFromSelection', () => {
  const doc = createDoc([para('a', 'hello'), para('b', 'mid'), para('c', 'world')]);

  it('cuts a same-block range as an open fragment', () => {
    const slice = sliceFromSelection(doc, textSelection({ blockId: 'a', offset: 1 }, { blockId: 'a', offset: 3 }))!;
    expect(slice.openStart && slice.openEnd).toBe(true);
    expect(slice.blocks.map(nodeText)).toEqual(['el']);
  });

  it('cuts a cross-block range with partial ends and whole middles', () => {
    const slice = sliceFromSelection(doc, textSelection({ blockId: 'c', offset: 2 }, { blockId: 'a', offset: 3 }))!;
    expect(slice.blocks.map(nodeText)).toEqual(['lo', 'mid', 'wo']);
  });

  it('takes whole blocks for a node selection', () => {
    const slice = sliceFromSelection(doc, nodeSelection(['b']))!;
    expect(slice.openStart || slice.openEnd).toBe(false);
    expect(slice.blocks[0]!.id).toBe('b');
  });

  it('returns null for a caret', () => {
    expect(sliceFromSelection(doc, caret('a', 1))).toBeNull();
  });

  it('withFreshIds renames every block', () => {
    const copies = withFreshIds(doc.content);
    expect(copies.map(block => block.id)).not.toContain('a');
    expect(copies.map(nodeText)).toEqual(['hello', 'mid', 'world']);
  });
});

describe('block commands for the gutter', () => {
  it('moveBlocks places blocks before the boundary, in document order, as one undo entry', () => {
    const w = writekitWith([para('a', 'a'), para('b', 'b'), para('c', 'c'), para('d', 'd')]);
    expect(w.command(moveBlocks(['b'], 3))).toBe(true);
    expect(texts(w)).toEqual(['a', 'c', 'b', 'd']);

    expect(w.command(moveBlocks(['a', 'b'], 4))).toBe(true);
    expect(texts(w)).toEqual(['c', 'd', 'a', 'b']);

    expect(w.undo()).toBe(true);
    expect(texts(w)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('moveBlocks refuses a drop that changes nothing', () => {
    const w = writekitWith([para('a', 'a'), para('b', 'b'), para('c', 'c')]);
    expect(w.command(moveBlocks(['b'], 1))).toBe(false);
    expect(w.command(moveBlocks(['b'], 2))).toBe(false);
    expect(w.command(moveBlocks(['zzz'], 0))).toBe(false);
  });

  it('convertBlock sheds forbidden marks and undo brings them back', () => {
    const bold = createNode('paragraph', { id: 'a', content: [{ text: 'ab', marks: [{ type: 'bold' }] }] });
    const w = writekitWith([bold], caret('a', 1));
    expect(w.command(convertBlock('a', 'code-block'))).toBe(true);
    expect(nodeInline(w.state.doc.content[0]!)).toEqual([{ text: 'ab', marks: [] }]);
    expect(w.state.selection).toEqual(caret('a', 1));

    w.undo();
    expect(w.state.doc.content[0]!.type).toBe('paragraph');
    expect(nodeInline(w.state.doc.content[0]!)).toEqual([{ text: 'ab', marks: [{ type: 'bold' }] }]);
  });

  it('convertBlock refuses atoms and unknown types', () => {
    const w = writekitWith([createNode('divider', { id: 'd' }), para('a', 'x')]);
    expect(w.command(convertBlock('d', 'paragraph'))).toBe(true); // an atom may become text
    expect(w.command(convertBlock('a', 'divider'))).toBe(false);
    expect(w.command(convertBlock('a', 'nope'))).toBe(false);
  });

  it('duplicateBlock copies under a fresh id right below', () => {
    const w = writekitWith([para('a', 'x'), para('b', 'y')]);
    expect(w.command(duplicateBlock('a'))).toBe(true);
    expect(texts(w)).toEqual(['x', 'x', 'y']);
    expect(w.state.doc.content[1]!.id).not.toBe('a');
  });

  it('insertBlockBeside seeds a line below (or above) with the caret at its end', () => {
    const w = writekitWith([para('a', 'x'), para('b', 'y')]);
    const slash = createNode('paragraph', { content: [{ text: '/', marks: [] }] });
    expect(w.command(insertBlockBeside('a', slash))).toBe(true);
    expect(texts(w)).toEqual(['x', '/', 'y']);
    expect(w.state.selection).toEqual(caret(slash.id, 1));

    const above = createNode('paragraph');
    w.command(insertBlockBeside('a', above, { above: true }));
    expect(w.state.doc.content[0]!.id).toBe(above.id);
  });
});
