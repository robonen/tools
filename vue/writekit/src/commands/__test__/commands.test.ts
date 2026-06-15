import { describe, expect, it } from 'vitest';
import { caret, createDoc, createNode, nodeInline, nodeText, textSelection } from '../../model';
import { createDefaultRegistry } from '../../preset';
import { createWritekit, createWritekitState } from '../../state';
import { joinBackward, splitBlock, toggleMark } from '..';

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

  it('undo restores the document after a split', () => {
    const writekit = writekitWith([para('a', 'hello')], caret('a', 2));
    writekit.command(splitBlock);
    expect(writekit.state.doc.content.length).toBe(2);
    expect(writekit.undo()).toBe(true);
    expect(writekit.state.doc.content.map(block => nodeText(block))).toEqual(['hello']);
  });
});
