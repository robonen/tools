import { describe, expect, it } from 'vitest';
import { caret, createDoc, createNode, nodeInline, nodeText, textSelection } from '../../model';
import { createDefaultRegistry } from '../../preset';
import { createEditor, createEditorState } from '../../state';
import { joinBackward, splitBlock, toggleMark } from '..';

function para(id: string, text: string) {
  return createNode('paragraph', { id, content: text ? [{ text, marks: [] }] : [] });
}

function editorWith(blocks: Array<ReturnType<typeof para>>, selection?: ReturnType<typeof caret>) {
  const registry = createDefaultRegistry();
  return createEditor({ state: createEditorState({ registry, doc: createDoc(blocks), selection }) });
}

describe('commands', () => {
  it('toggleMark applies then removes bold on a range', () => {
    const registry = createDefaultRegistry();
    const editor = createEditor({
      state: createEditorState({
        registry,
        doc: createDoc([para('a', 'abc')]),
        selection: textSelection({ blockId: 'a', offset: 0 }, { blockId: 'a', offset: 3 }),
      }),
    });

    expect(editor.command(toggleMark('bold'))).toBe(true);
    expect(nodeInline(editor.state.doc.content[0]!)).toEqual([{ text: 'abc', marks: [{ type: 'bold' }] }]);

    editor.command(toggleMark('bold'));
    expect(nodeInline(editor.state.doc.content[0]!)).toEqual([{ text: 'abc', marks: [] }]);
  });

  it('splitBlock splits at the caret', () => {
    const editor = editorWith([para('a', 'hello')], caret('a', 2));
    expect(editor.command(splitBlock)).toBe(true);
    expect(editor.state.doc.content.map(block => nodeText(block))).toEqual(['he', 'llo']);
    expect(editor.state.selection.kind).toBe('text');
  });

  it('joinBackward merges into the previous block', () => {
    const editor = editorWith([para('a', 'foo'), para('b', 'bar')], caret('b', 0));
    expect(editor.command(joinBackward)).toBe(true);
    expect(editor.state.doc.content.map(block => nodeText(block))).toEqual(['foobar']);
  });

  it('undo restores the document after a split', () => {
    const editor = editorWith([para('a', 'hello')], caret('a', 2));
    editor.command(splitBlock);
    expect(editor.state.doc.content.length).toBe(2);
    expect(editor.undo()).toBe(true);
    expect(editor.state.doc.content.map(block => nodeText(block))).toEqual(['hello']);
  });
});
