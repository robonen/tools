import { render } from 'vitest-browser-vue';
import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import type { Node } from '../../model';
import { caret, createDoc, createNode, nodeSelection, nodeText, textSelection } from '../../model';
import { createDefaultRegistry } from '../../preset';
import { createTransaction, createWritekit, createWritekitState } from '../../state';
import { WRITEKIT_MIME } from '../clipboard';
import WritekitRoot from '../WritekitRoot.vue';

function para(id: string, text: string): Node {
  return createNode('paragraph', { id, content: text ? [{ text, marks: [] }] : [] });
}

function mount(blocks: Node[]) {
  const registry = createDefaultRegistry();
  const writekit = createWritekit({ state: createWritekitState({ registry, doc: createDoc(blocks) }) });
  render(WritekitRoot, { props: { writekit, platform: 'mac' } });
  return writekit;
}

const root = () => document.querySelector<HTMLElement>('[data-writekit-content]')!;
const texts = (w: ReturnType<typeof mount>) => w.state.doc.content.map(block => nodeText(block));

function transfer(entries: Record<string, string>): DataTransfer {
  const data = new DataTransfer();
  for (const [type, value] of Object.entries(entries))
    data.setData(type, value);
  return data;
}

async function select(w: ReturnType<typeof mount>, selection: Parameters<ReturnType<typeof createTransaction>['setSelection']>[0]) {
  w.dispatch(createTransaction(w.state).setSelection(selection));
  await nextTick();
}

function paste(entries: Record<string, string>): boolean {
  const event = new ClipboardEvent('paste', { clipboardData: transfer(entries), bubbles: true, cancelable: true });
  root().dispatchEvent(event);
  return event.defaultPrevented;
}

function beforeInput(inputType: string, data: string | null = null): boolean {
  const event = new InputEvent('beforeinput', { inputType, data, bubbles: true, cancelable: true });
  root().dispatchEvent(event);
  return event.defaultPrevented;
}

describe('paste goes through the model', () => {
  it('replaces a selection with the pasted text — nothing is lost', async () => {
    const w = mount([para('a', 'hello world')]);
    await select(w, textSelection({ blockId: 'a', offset: 0 }, { blockId: 'a', offset: 5 }));

    expect(paste({ 'text/plain': 'PASTED' })).toBe(true);
    expect(texts(w)).toEqual(['PASTED world']);
    expect(w.state.selection).toEqual(caret('a', 6));
  });

  it('inserts several blocks at a caret and leaves the DOM exactly as the model says', async () => {
    const w = mount([para('a', 'helloworld')]);
    await select(w, caret('a', 5));

    paste({ 'text/html': '<h2>Title</h2><p>body <b>bold</b></p><div style="white-space:pre;font-family:Menlo">last</div>' });
    await nextTick();

    expect(w.state.doc.content.map(block => block.type)).toEqual(['paragraph', 'paragraph', 'paragraph']);
    expect(texts(w)).toEqual(['helloTitle', 'body bold', 'lastworld']);

    const hosts = root().querySelectorAll('[data-block-content]');
    expect(hosts.length).toBe(w.state.doc.content.length);
    const ids = Array.from(root().querySelectorAll('[data-block-type]')).map(el => el.getAttribute('data-block-id'));
    expect(new Set(ids).size).toBe(ids.length);
    expect(root().querySelector('[style]')).toBeNull();
    expect(root().querySelector('strong')?.textContent).toBe('bold');
  });

  it('pastes markdown-looking text as structure and lands the caret after it', async () => {
    const w = mount([para('a', '')]);
    await select(w, caret('a', 0));

    paste({ 'text/plain': '# Title\n- one\n- two' });
    expect(w.state.doc.content.map(block => block.type)).toEqual(['heading', 'bulleted-list', 'bulleted-list']);
    expect(w.state.doc.content[0]!.id).toBe('a');
    expect(w.state.selection).toEqual(caret(w.state.doc.content[2]!.id, 3));
  });

  it('is one undo step', async () => {
    const w = mount([para('a', 'ab')]);
    await select(w, caret('a', 1));
    paste({ 'text/plain': 'x\ny\nz' });
    expect(texts(w)).toEqual(['ax', 'y', 'zb']);
    w.undo();
    expect(texts(w)).toEqual(['ab']);
  });
});

describe('copy and cut', () => {
  it('copy writes html, text and the writekit format for the selection', async () => {
    const w = mount([para('a', 'hello'), para('b', 'world')]);
    await select(w, textSelection({ blockId: 'a', offset: 2 }, { blockId: 'b', offset: 3 }));

    const data = new DataTransfer();
    const event = new ClipboardEvent('copy', { clipboardData: data, bubbles: true, cancelable: true });
    root().dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(data.getData('text/plain')).toBe('llo\nwor');
    expect(data.getData('text/html')).toBe('<p>llo</p><p>wor</p>');
    expect(JSON.parse(data.getData(WRITEKIT_MIME)).openStart).toBe(true);
    expect(texts(w)).toEqual(['hello', 'world']);
  });

  it('cut copies then deletes through the model', async () => {
    const w = mount([para('a', 'hello'), createNode('divider', { id: 'd' }), para('b', 'world')]);
    await select(w, nodeSelection(['d']));

    const data = new DataTransfer();
    root().dispatchEvent(new ClipboardEvent('cut', { clipboardData: data, bubbles: true, cancelable: true }));

    expect(JSON.parse(data.getData(WRITEKIT_MIME)).blocks[0].type).toBe('divider');
    expect(w.state.doc.content.map(block => block.type)).toEqual(['paragraph', 'paragraph']);
  });
});

describe('the browser may only edit inline text', () => {
  it('cancels a native paste, drop and structural inserts', async () => {
    const w = mount([para('a', 'ab')]);
    await select(w, caret('a', 1));

    for (const type of ['insertFromPaste', 'insertFromDrop', 'insertHorizontalRule', 'insertLink', 'insertOrderedList', 'insertFromYank'])
      expect(beforeInput(type), type).toBe(true);

    expect(texts(w)).toEqual(['ab']);
  });

  it('leaves plain typing and intra-block deletion to the browser', async () => {
    const w = mount([para('a', 'ab')]);
    await select(w, caret('a', 1));

    expect(beforeInput('insertText', 'x')).toBe(false);
    expect(beforeInput('deleteContentBackward')).toBe(false);
    expect(beforeInput('deleteWordForward')).toBe(false);
  });

  it('turns word deletion at a block edge into a join', async () => {
    const w = mount([para('a', 'ab'), para('b', 'cd')]);
    await select(w, caret('b', 0));

    expect(beforeInput('deleteWordBackward')).toBe(true);
    expect(texts(w)).toEqual(['abcd']);
  });

  it('typing over a range replaces it in one transaction and keeps the block type', async () => {
    const w = mount([createNode('heading', { id: 'h', attrs: { level: 2 }, content: [{ text: 'Title', marks: [] }] })]);
    await select(w, textSelection({ blockId: 'h', offset: 0 }, { blockId: 'h', offset: 5 }));

    expect(beforeInput('insertText', 'T')).toBe(true);
    expect(w.state.doc.content[0]!.type).toBe('heading');
    expect(texts(w)).toEqual(['T']);
    expect(w.state.selection).toEqual(caret('h', 1));
  });

  it('runs undo from a native history edit', async () => {
    const w = mount([para('a', 'ab')]);
    await select(w, textSelection({ blockId: 'a', offset: 0 }, { blockId: 'a', offset: 2 }));
    beforeInput('insertText', 'x');
    expect(texts(w)).toEqual(['x']);

    expect(beforeInput('historyUndo')).toBe(true);
    expect(texts(w)).toEqual(['ab']);
  });

  it('never lets a native drag start inside the editor', () => {
    mount([para('a', 'ab')]);
    const event = new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: new DataTransfer() });
    root().dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
