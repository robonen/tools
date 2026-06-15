<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  WritekitRoot,
  createNode,
  createTransaction,
  moveBlockDown,
  moveBlockUp,
  removeBlock,
  setBlockType,
  toggleMark,
} from '@writekit';
import { h, makeWritekit, p } from '../lib';

const writekit = makeWritekit([
  h(1, 'Commands API'),
  p('Drive the writekit programmatically with the buttons below. Put the caret in a block first.'),
  p('Second block.'),
  p('Third block.'),
]);

const rev = ref(0);
writekit.on('transaction', () => (rev.value += 1));
const docJson = computed(() => (rev.value, JSON.stringify(writekit.state.doc, null, 2)));
const canDelete = computed(() => (rev.value, writekit.state.doc.content.length > 1));

function focusId(): string | undefined {
  const sel = writekit.state.selection;
  return sel.kind === 'text' ? sel.focus.blockId : sel.ids[0];
}

function appendParagraph(): void {
  const node = createNode('paragraph', { content: [{ text: 'Appended block', marks: [] }] });
  writekit.dispatch(createTransaction(writekit.state).insertBlock(node, writekit.state.doc.content.length));
}

function deleteFocused(): void {
  const id = focusId();
  if (id && writekit.state.doc.content.length > 1)
    writekit.command(removeBlock(id));
}
</script>

<template>
  <section>
    <h2>Commands API</h2>
    <p class="hint">Programmatic control — every button is a command or transaction on the writekit.</p>

    <div class="toolbar wrap">
      <button @mousedown.prevent="appendParagraph">Append paragraph</button>
      <button @mousedown.prevent="writekit.command(moveBlockUp)">Move block ↑</button>
      <button @mousedown.prevent="writekit.command(moveBlockDown)">Move block ↓</button>
      <button @mousedown.prevent="writekit.command(setBlockType('heading', { level: 1 }))">→ H1</button>
      <button @mousedown.prevent="writekit.command(setBlockType('paragraph'))">→ Paragraph</button>
      <button @mousedown.prevent="writekit.command(toggleMark('bold'))">Toggle bold</button>
      <button :disabled="!canDelete" @mousedown.prevent="deleteFocused">Delete block</button>
    </div>

    <WritekitRoot :writekit="writekit" class="writekit" />
    <details><summary>document JSON</summary><pre>{{ docJson }}</pre></details>
  </section>
</template>
