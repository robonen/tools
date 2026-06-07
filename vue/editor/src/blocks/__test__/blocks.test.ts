import { describe, expect, it } from 'vitest';
import { caret, createDoc, createNode, nodeInline, nodeText, textSelection } from '../../model';
import { applyInputRule, joinBackward, splitBlock, toggleMark } from '../../commands';
import { createDefaultRegistry } from '../../preset';
import { createEditor, createEditorState } from '../../state';

function editorWith(node: ReturnType<typeof createNode>, selection?: ReturnType<typeof caret>) {
  const registry = createDefaultRegistry();
  return createEditor({ state: createEditorState({ registry, doc: createDoc([node]), selection }) });
}

describe('default registry', () => {
  it('registers the full block and mark set', () => {
    const registry = createDefaultRegistry();
    for (const type of ['paragraph', 'heading', 'blockquote', 'code-block', 'callout', 'bulleted-list', 'numbered-list', 'todo-list', 'divider', 'image'])
      expect(registry.hasBlock(type)).toBe(true);
    for (const mark of ['bold', 'italic', 'underline', 'strike', 'highlight', 'code', 'link'])
      expect(registry.hasMark(mark)).toBe(true);
  });

  it('marks the list blocks as group "list" and gives to-do a checked attr', () => {
    const registry = createDefaultRegistry();
    expect(registry.getBlock('bulleted-list')?.spec.group).toBe('list');
    expect(registry.getBlock('todo-list')?.spec.attrs?.['checked']).toBeDefined();
  });

  it('inline code mark excludes all others', () => {
    expect(createDefaultRegistry().getMark('code')?.spec.excludes).toBe('_all');
  });
});

describe('code block', () => {
  it('Enter inserts a newline instead of splitting', () => {
    const editor = editorWith(createNode('code-block', { id: 'c', content: [{ text: 'ab', marks: [] }] }), caret('c', 2));
    expect(editor.command(splitBlock)).toBe(true);
    expect(editor.state.doc.content.length).toBe(1);
    expect(nodeText(editor.state.doc.content[0]!)).toBe('ab\n');
  });

  it('disallows inline marks', () => {
    const editor = editorWith(
      createNode('code-block', { id: 'c', content: [{ text: 'abc', marks: [] }] }),
      textSelection({ blockId: 'c', offset: 0 }, { blockId: 'c', offset: 3 }),
    );
    expect(editor.command(toggleMark('bold'))).toBe(false);
  });

  it('does not absorb disallowed marks when another block merges into it', () => {
    const registry = createDefaultRegistry();
    const editor = createEditor({
      state: createEditorState({
        registry,
        doc: createDoc([
          createNode('code-block', { id: 'c', content: [{ text: 'x', marks: [] }] }),
          createNode('paragraph', { id: 'p', content: [{ text: 'B', marks: [{ type: 'bold' }] }] }),
        ]),
        selection: caret('p', 0),
      }),
    });

    expect(editor.command(joinBackward)).toBe(true);
    const merged = editor.state.doc.content[0]!;
    expect(merged.type).toBe('code-block');
    expect(nodeText(merged)).toBe('xB');
    expect(nodeInline(merged).every(run => run.marks.length === 0)).toBe(true);
  });
});

describe('input rules', () => {
  it('"# " converts a paragraph to a level-1 heading and strips the marker', () => {
    const editor = editorWith(createNode('paragraph', { id: 'p', content: [{ text: '# ', marks: [] }] }), caret('p', 2));
    expect(editor.command(applyInputRule)).toBe(true);
    const block = editor.state.doc.content[0]!;
    expect(block.type).toBe('heading');
    expect(block.attrs['level']).toBe(1);
    expect(nodeText(block)).toBe('');
  });

  it('"- " converts a paragraph to a bulleted list', () => {
    const editor = editorWith(createNode('paragraph', { id: 'p', content: [{ text: '- ', marks: [] }] }), caret('p', 2));
    expect(editor.command(applyInputRule)).toBe(true);
    expect(editor.state.doc.content[0]!.type).toBe('bulleted-list');
  });

  it('does not re-fire when the block is already the target type', () => {
    const editor = editorWith(createNode('blockquote', { id: 'q', content: [{ text: '> ', marks: [] }] }), caret('q', 2));
    expect(editor.command(applyInputRule)).toBe(false);
  });
});

describe('to-do list', () => {
  it('starts a new item unchecked when splitting a checked one', () => {
    const editor = editorWith(
      createNode('todo-list', { id: 't', attrs: { checked: true, indent: 0 }, content: [{ text: 'done', marks: [] }] }),
      caret('t', 4),
    );

    expect(editor.command(splitBlock)).toBe(true);
    expect(editor.state.doc.content.length).toBe(2);
    const created = editor.state.doc.content[1]!;
    expect(created.type).toBe('todo-list');
    expect(created.attrs['checked']).toBe(false);
  });
});
