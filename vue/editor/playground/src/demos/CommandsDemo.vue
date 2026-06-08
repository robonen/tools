<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  EditorRoot,
  createNode,
  createTransaction,
  moveBlockDown,
  moveBlockUp,
  removeBlock,
  setBlockType,
  toggleMark,
} from '@editor';
import { h, makeEditor, p } from '../lib';

const editor = makeEditor([
  h(1, 'Commands API'),
  p('Drive the editor programmatically with the buttons below. Put the caret in a block first.'),
  p('Second block.'),
  p('Third block.'),
]);

const rev = ref(0);
editor.on('transaction', () => (rev.value += 1));
const docJson = computed(() => (rev.value, JSON.stringify(editor.state.doc, null, 2)));
const canDelete = computed(() => (rev.value, editor.state.doc.content.length > 1));

function focusId(): string | undefined {
  const sel = editor.state.selection;
  return sel.kind === 'text' ? sel.focus.blockId : sel.ids[0];
}

function appendParagraph(): void {
  const node = createNode('paragraph', { content: [{ text: 'Appended block', marks: [] }] });
  editor.dispatch(createTransaction(editor.state).insertBlock(node, editor.state.doc.content.length));
}

function deleteFocused(): void {
  const id = focusId();
  if (id && editor.state.doc.content.length > 1)
    editor.command(removeBlock(id));
}
</script>

<template>
  <section>
    <h2>Commands API</h2>
    <p class="hint">Programmatic control — every button is a command or transaction on the editor.</p>

    <div class="toolbar wrap">
      <button @mousedown.prevent="appendParagraph">Append paragraph</button>
      <button @mousedown.prevent="editor.command(moveBlockUp)">Move block ↑</button>
      <button @mousedown.prevent="editor.command(moveBlockDown)">Move block ↓</button>
      <button @mousedown.prevent="editor.command(setBlockType('heading', { level: 1 }))">→ H1</button>
      <button @mousedown.prevent="editor.command(setBlockType('paragraph'))">→ Paragraph</button>
      <button @mousedown.prevent="editor.command(toggleMark('bold'))">Toggle bold</button>
      <button :disabled="!canDelete" @mousedown.prevent="deleteFocused">Delete block</button>
    </div>

    <EditorRoot :editor="editor" class="editor" />
    <details><summary>document JSON</summary><pre>{{ docJson }}</pre></details>
  </section>
</template>
