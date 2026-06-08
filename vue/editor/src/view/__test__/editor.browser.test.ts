import { render } from 'vitest-browser-vue';
import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { createDoc, createNode, textSelection } from '../../model';
import { createDefaultRegistry } from '../../preset';
import { createEditor, createEditorState, createTransaction } from '../../state';
import EditorRoot from '../EditorRoot.vue';

function para(id: string, text: string) {
  return createNode('paragraph', { id, content: text ? [{ text, marks: [] }] : [] });
}

function mount(blocks: Array<ReturnType<typeof para>>) {
  const registry = createDefaultRegistry();
  const editor = createEditor({ state: createEditorState({ registry, doc: createDoc(blocks) }) });
  render(EditorRoot, { props: { editor, platform: 'mac' } });
  return editor;
}

function selectNative(anchor: { node: Node; offset: number }, focus: { node: Node; offset: number }) {
  const sel = getSelection()!;
  sel.removeAllRanges();
  const range = document.createRange();
  range.setStart(anchor.node, anchor.offset);
  range.setEnd(focus.node, focus.offset);
  sel.addRange(range);
}

describe('EditorRoot (single contenteditable)', () => {
  it('renders ONE editable root containing non-editable block elements', async () => {
    mount([para('a', 'hello')]);
    await nextTick();

    const ce = document.querySelector('[data-editor-content]')!;
    expect(ce.getAttribute('contenteditable')).toBe('true');

    const host = document.querySelector('[data-block-content]') as HTMLElement;
    expect(host.textContent).toBe('hello');
    // The block element itself is NOT a separate editing host.
    expect(host.getAttribute('contenteditable')).toBeNull();
  });

  it('maps a cross-block native selection to a cross-block model range', async () => {
    const editor = mount([para('a', 'hello'), para('b', 'world')]);
    await nextTick();

    const hosts = document.querySelectorAll('[data-block-content]');
    const aText = hosts[0]!.firstChild!; // text node "hello"
    const bText = hosts[1]!.firstChild!; // text node "world"

    selectNative({ node: aText, offset: 1 }, { node: bText, offset: 3 });

    // `selectionchange` is dispatched on a macrotask, so awaiting microtasks
    // (nextTick) isn't enough — poll until the editor has synced the model.
    const sel = await vi.waitFor(() => {
      const s = editor.state.selection;
      if (s.kind !== 'text' || s.anchor.offset !== 1)
        throw new Error('selection not synced yet');
      return s;
    });

    expect(sel.anchor.blockId).toBe('a');
    expect(sel.anchor.offset).toBe(1);
    expect(sel.focus.blockId).toBe('b');
    expect(sel.focus.offset).toBe(3);
  });

  it('writes a cross-block model selection back to a native range spanning blocks', async () => {
    const editor = mount([para('a', 'hello'), para('b', 'world')]);
    await nextTick();

    editor.dispatch(createTransaction(editor.state).setSelection(
      textSelection({ blockId: 'a', offset: 2 }, { blockId: 'b', offset: 4 }),
    ));
    await nextTick();
    await nextTick();

    const sel = getSelection()!;
    const hosts = document.querySelectorAll('[data-block-content]');
    expect(hosts[0]!.contains(sel.anchorNode)).toBe(true);
    expect(hosts[1]!.contains(sel.focusNode)).toBe(true);
    expect(sel.isCollapsed).toBe(false);
  });

  it('applies bold via Mod-b to a selected range', async () => {
    const editor = mount([para('a', 'hello')]);
    await nextTick();

    editor.dispatch(createTransaction(editor.state).setSelection(
      textSelection({ blockId: 'a', offset: 0 }, { blockId: 'a', offset: 5 }),
    ));
    await nextTick();

    const root = document.querySelector<HTMLElement>('[data-editor-root]')!;
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', metaKey: true, bubbles: true, cancelable: true }));
    await nextTick();
    await nextTick();

    expect(document.querySelector('[data-block-content] strong')?.textContent).toBe('hello');
  });

  it('splits a block on Enter', async () => {
    const editor = mount([para('a', 'hello')]);
    await nextTick();

    editor.dispatch(createTransaction(editor.state).setSelection(textSelection({ blockId: 'a', offset: 2 })));
    await nextTick();

    const root = document.querySelector<HTMLElement>('[data-editor-root]')!;
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await nextTick();
    await nextTick();

    const hosts = document.querySelectorAll('[data-block-content]');
    expect(hosts.length).toBe(2);
    expect(hosts[0]!.textContent).toBe('he');
    expect(hosts[1]!.textContent).toBe('llo');
  });

  it('merges into the previous block on Backspace at block start', async () => {
    const editor = mount([para('a', 'foo'), para('b', 'bar')]);
    await nextTick();

    editor.dispatch(createTransaction(editor.state).setSelection(textSelection({ blockId: 'b', offset: 0 })));
    await nextTick();

    const root = document.querySelector<HTMLElement>('[data-editor-root]')!;
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));
    await nextTick();
    await nextTick();

    const hosts = document.querySelectorAll('[data-block-content]');
    expect(hosts.length).toBe(1);
    expect(hosts[0]!.textContent).toBe('foobar');
  });
});
