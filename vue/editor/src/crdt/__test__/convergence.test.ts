import { describe, expect, it } from 'vitest';
import { caret, createDoc, createNode, nodeSelection, nodeText } from '../../model';
import { deleteSelection } from '../../commands';
import { createDefaultRegistry } from '../../preset';
import { createEditor, createEditorState, createTransaction } from '../../state';
import { bindCrdt } from '../binding';
import type { RemoteCursor } from '../types';
import { createNativeProvider } from '../native/provider';

function makePeer(seedDoc?: ReturnType<typeof createDoc>) {
  const registry = createDefaultRegistry();
  const editor = createEditor({ state: createEditorState({ registry, doc: seedDoc }) });
  const provider = createNativeProvider({ schema: registry.schema, doc: seedDoc ? editor.state.doc : undefined });
  bindCrdt(editor, provider);
  return { editor, provider };
}

/** Live two-way, in-memory transport between two providers. */
function connect(a: ReturnType<typeof makePeer>, b: ReturnType<typeof makePeer>) {
  a.provider.onLocalOps(bytes => b.provider.applyUpdate(bytes));
  b.provider.onLocalOps(bytes => a.provider.applyUpdate(bytes));
}

function text(peer: ReturnType<typeof makePeer>): string {
  return peer.editor.state.doc.content.map(block => nodeText(block)).join('\n');
}

describe('crdt convergence (two editors)', () => {
  it('a joining peer syncs the initial document, then concurrent edits converge', () => {
    const doc = createDoc([createNode('paragraph', { id: 'p', content: [{ text: 'Hello', marks: [] }] })]);

    const a = makePeer(doc);
    const b = makePeer(); // empty; joins by syncing A's full state
    b.provider.applyUpdate(a.provider.encodeDelta());

    expect(text(b)).toBe('Hello');

    connect(a, b);

    // Concurrent edits at opposite ends of the same block.
    a.editor.dispatch(createTransaction(a.editor.state).insertText({ blockId: 'p', offset: 5 }, '!', []).setSelection(caret('p', 6)));
    b.editor.dispatch(createTransaction(b.editor.state).insertText({ blockId: 'p', offset: 0 }, '>', []).setSelection(caret('p', 1)));

    expect(text(a)).toBe(text(b));
    expect(text(a)).toBe('>Hello!');
  });

  it('keeps offsets aligned for astral characters (emoji) across replicas', () => {
    const doc = createDoc([createNode('paragraph', { id: 'p', content: [{ text: 'a👍b', marks: [] }] })]);
    const a = makePeer(doc);
    const b = makePeer();
    b.provider.applyUpdate(a.provider.encodeDelta());
    connect(a, b);

    // 'b' sits at UTF-16 offset 3 (the emoji occupies offsets 1..3).
    a.editor.dispatch(createTransaction(a.editor.state).deleteText('p', 3, 4).setSelection(caret('p', 3)));

    expect(text(a)).toBe('a👍');
    expect(text(b)).toBe('a👍');
  });

  it('undo of a select-all delete does not duplicate content on the other replica', () => {
    const doc = createDoc([
      createNode('paragraph', { id: 'a', content: [{ text: 'AAA', marks: [] }] }),
      createNode('paragraph', { id: 'b', content: [{ text: 'BBB', marks: [] }] }),
    ]);
    const a = makePeer(doc);
    const b = makePeer();
    b.provider.applyUpdate(a.provider.encodeDelta());
    connect(a, b);
    expect(text(b)).toBe('AAA\nBBB');

    // Select every block and delete (inserts one fresh empty paragraph).
    a.editor.dispatch(createTransaction(a.editor.state).setSelection(nodeSelection(['a', 'b'])));
    expect(a.editor.command(deleteSelection)).toBe(true);
    expect(text(a)).toBe('');

    // Undo must restore the blocks without duplicating them on either replica.
    expect(a.editor.undo()).toBe(true);
    expect(text(a)).toBe('AAA\nBBB');
    expect(text(b)).toBe('AAA\nBBB');
  });

  it('awareness: a remote cursor anchor stays on its character when text is inserted before it', () => {
    const doc = createDoc([createNode('paragraph', { id: 'p', content: [{ text: 'Hello', marks: [] }] })]);
    const a = makePeer(doc);
    const b = makePeer();
    b.provider.applyUpdate(a.provider.encodeDelta());

    let cursors: RemoteCursor[] = [];
    a.provider.onAwareness((next) => {
      cursors = next;
    });
    b.provider.onLocalAwareness(bytes => a.provider.applyAwareness(bytes));

    // B places its caret after "Hello" (offset 5).
    b.editor.dispatch(createTransaction(b.editor.state).setSelection(caret('p', 5)));
    expect(cursors[0]?.selection?.kind).toBe('text');
    expect(cursors[0]?.selection?.kind === 'text' && cursors[0].selection.focus.offset).toBe(5);

    // A edits locally; A's view of B's cursor (anchored after 'o') re-resolves to offset 7.
    a.editor.dispatch(createTransaction(a.editor.state).insertText({ blockId: 'p', offset: 0 }, '>>', []).setSelection(caret('p', 2)));
    expect(cursors[0]?.selection?.kind === 'text' && cursors[0].selection.focus.offset).toBe(7);
  });

  it('converges across splits, bold, and a second block', () => {
    const doc = createDoc([createNode('paragraph', { id: 'p', content: [{ text: 'abcdef', marks: [] }] })]);
    const a = makePeer(doc);
    const b = makePeer();
    b.provider.applyUpdate(a.provider.encodeDelta());
    connect(a, b);

    // A bolds "ab" (stays in the head block); B splits after "abc" — concurrently.
    a.editor.dispatch(createTransaction(a.editor.state).addMark('p', 0, 2, { type: 'bold' }).setSelection(caret('p', 2)));
    b.editor.dispatch(createTransaction(b.editor.state).splitBlock({ blockId: 'p', offset: 3 }, undefined, undefined, 'p2').setSelection(caret('p2', 0)));

    expect(text(a)).toBe(text(b));
    // Document text is preserved across both edits (split inserts a block boundary).
    expect(text(a).replace('\n', '')).toBe('abcdef');

    // The bold mark survived on both replicas (somewhere in the doc).
    const hasBold = (peer: ReturnType<typeof makePeer>) =>
      peer.editor.state.doc.content.some(block =>
        Array.isArray(block.content) && block.content.some(run => 'marks' in run && run.marks.some((m: { type: string }) => m.type === 'bold')));
    expect(hasBold(a)).toBe(true);
    expect(hasBold(b)).toBe(true);
  });

  it('per-block patching: a remote edit keeps untouched block node identities', () => {
    const doc = createDoc([
      createNode('paragraph', { id: 'a', content: [{ text: 'AAA', marks: [] }] }),
      createNode('paragraph', { id: 'b', content: [{ text: 'BBB', marks: [] }] }),
    ]);
    const a = makePeer(doc);
    const b = makePeer();
    b.provider.applyUpdate(a.provider.encodeDelta());
    connect(a, b);

    const bBefore = b.editor.state.doc.content.find(node => node.id === 'b')!;

    a.editor.dispatch(createTransaction(a.editor.state).insertText({ blockId: 'a', offset: 3 }, '!', []).setSelection(caret('a', 4)));

    expect(nodeText(b.editor.state.doc.content.find(node => node.id === 'a')!)).toBe('AAA!'); // changed block updated
    expect(b.editor.state.doc.content.find(node => node.id === 'b')!).toBe(bBefore); // untouched block reused identity
  });

  it('tombstone GC compacts deleted content, preserving the document and convergence', () => {
    const doc = createDoc([createNode('paragraph', { id: 'p', content: [{ text: 'Hello World', marks: [] }] })]);
    const a = makePeer(doc);
    const b = makePeer();
    b.provider.applyUpdate(a.provider.encodeDelta());
    connect(a, b);

    a.editor.dispatch(createTransaction(a.editor.state).deleteText('p', 5, 11).setSelection(caret('p', 5)));
    a.editor.dispatch(createTransaction(a.editor.state).addMark('p', 0, 5, { type: 'bold' }).setSelection(caret('p', 5)));
    expect(text(a)).toBe('Hello');
    expect(text(b)).toBe('Hello');

    // Quiesced + fully synced → GC is safe on both replicas.
    const removed = a.provider.gc();
    b.provider.gc();
    expect(removed.chars).toBeGreaterThanOrEqual(6); // the deleted " World"

    // The compacted CRDT still materializes the right content and formatting.
    const reloaded = a.provider.load();
    expect(nodeText(reloaded.content[0]!)).toBe('Hello');
    const runs = reloaded.content[0]!.content;
    expect(Array.isArray(runs) && runs.length > 0 && 'marks' in runs[0]! && runs[0]!.marks.some((m: { type: string }) => m.type === 'bold')).toBe(true);

    // A further edit still converges across replicas.
    a.editor.dispatch(createTransaction(a.editor.state).insertText({ blockId: 'p', offset: 5 }, '!', []).setSelection(caret('p', 6)));
    expect(text(a)).toBe('Hello!');
    expect(text(b)).toBe('Hello!');
  });
});
