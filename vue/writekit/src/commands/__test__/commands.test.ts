import { describe, expect, it } from 'vitest';
import { caret, createDoc, createNode, nodeInline, nodeSelection, nodeText, textSelection } from '../../model';
import { createDefaultRegistry } from '../../preset';
import { createWritekit, createWritekitState } from '../../state';
import { exitAtom, joinBackward, splitBlock, toggleMark } from '..';

function para(id: string, text: string) {
  return createNode('paragraph', { id, content: text ? [{ text, marks: [] }] : [] });
}

function writekitWith(blocks: Array<ReturnType<typeof para>>, selection?: ReturnType<typeof caret>) {
  const registry = createDefaultRegistry();
  return createWritekit({ state: createWritekitState({ registry, doc: createDoc(blocks), selection }) });
}

describe('commands', () => {
  it('toggleMark applies then removes bold on a range', () => {
    const registry = createDefaultRegistry();
    const writekit = createWritekit({
      state: createWritekitState({
        registry,
        doc: createDoc([para('a', 'abc')]),
        selection: textSelection({ blockId: 'a', offset: 0 }, { blockId: 'a', offset: 3 }),
      }),
    });

    expect(writekit.command(toggleMark('bold'))).toBe(true);
    expect(nodeInline(writekit.state.doc.content[0]!)).toEqual([{ text: 'abc', marks: [{ type: 'bold' }] }]);

    writekit.command(toggleMark('bold'));
    expect(nodeInline(writekit.state.doc.content[0]!)).toEqual([{ text: 'abc', marks: [] }]);
  });

  it('splitBlock splits at the caret', () => {
    const writekit = writekitWith([para('a', 'hello')], caret('a', 2));
    expect(writekit.command(splitBlock)).toBe(true);
    expect(writekit.state.doc.content.map(block => nodeText(block))).toEqual(['he', 'llo']);
    expect(writekit.state.selection.kind).toBe('text');
  });

  it('joinBackward merges into the previous block', () => {
    const writekit = writekitWith([para('a', 'foo'), para('b', 'bar')], caret('b', 0));
    expect(writekit.command(joinBackward)).toBe(true);
    expect(writekit.state.doc.content.map(block => nodeText(block))).toEqual(['foobar']);
  });

  it('exitAtom starts a paragraph below a selected atom', () => {
    const registry = createDefaultRegistry();
    const writekit = createWritekit({
      state: createWritekitState({
        registry,
        doc: createDoc([para('a', 'before'), createNode('divider', { id: 'd' })]),
        selection: nodeSelection(['d']),
      }),
    });

    expect(writekit.command(exitAtom)).toBe(true);

    const types = writekit.state.doc.content.map(block => block.type);
    expect(types).toEqual(['paragraph', 'divider', 'paragraph']);

    const sel = writekit.state.selection;
    expect(sel.kind).toBe('text');
    expect(sel.kind === 'text' && sel.focus.blockId).toBe(writekit.state.doc.content[2]!.id);
  });

  it('exitAtom is a no-op for text selections', () => {
    const writekit = writekitWith([para('a', 'hello')], caret('a', 2));
    expect(writekit.command(exitAtom)).toBe(false);
  });

  it('undo restores the document after a split', () => {
    const writekit = writekitWith([para('a', 'hello')], caret('a', 2));
    writekit.command(splitBlock);
    expect(writekit.state.doc.content.length).toBe(2);
    expect(writekit.undo()).toBe(true);
    expect(writekit.state.doc.content.map(block => nodeText(block))).toEqual(['hello']);
  });
});
