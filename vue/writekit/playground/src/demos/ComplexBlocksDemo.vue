<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Node } from '@writekit';
import {
  WritekitBubbleMenu,
  WritekitContent,
  WritekitRoot,
  WritekitSlashMenu,
  addMark,
  createTransaction,
  nodeSelection,
  setBlockType,
  toggleChecked,
  toggleMark,
} from '@writekit';
import { bullet, callout, code, divider, h, image, makeWritekit, numbered, p, quote, t, todo } from '../lib';

const writekit = makeWritekit([
  h(1, 'Complex blocks'),
  p([t('A document with '), t('many', 'bold'), t(' block types. Put the caret in a block and use the controls to convert it, or insert media.')]),
  quote('“The block is the unit of composition.” — a registry-driven writekit.'),
  callout('info', 'Callouts carry a variant attribute. This one is "info".'),
  callout('warn', 'And this is a "warn" callout.'),
  code('function hello() {\n  // Enter inserts a newline here, not a block split\n  return \'code block\';\n}'),
  h(2, 'Lists'),
  bullet('Bulleted item one'),
  bullet('Nested bullet (indent = 1) — Tab / Shift+Tab changes indent', 1),
  bullet('Bulleted item two'),
  numbered('Numbered item (counter via CSS)'),
  numbered('Numbered item'),
  todo('A finished task', true),
  todo('A pending task', false),
  h(2, 'Media (atoms)'),
  image('https://picsum.photos/seed/robonen/520/240', 'A random sample image'),
  divider(),
  p('Click an image or divider to select it, then Backspace/Delete removes it. Selecting an image reveals its URL / alt / caption fields.'),
]);

const rev = ref(0);
writekit.on('transaction', () => (rev.value += 1));
const docJson = computed(() => (rev.value, JSON.stringify(writekit.state.doc, null, 2)));

function focusIndex(): number {
  const sel = writekit.state.selection;
  const id = sel.kind === 'text' ? sel.focus.blockId : sel.ids[0];
  const index = id ? writekit.state.doc.content.findIndex(block => block.id === id) : -1;
  return index === -1 ? writekit.state.doc.content.length - 1 : index;
}

function insertAfterFocus(node: Node): void {
  writekit.dispatch(createTransaction(writekit.state).insertBlock(node, focusIndex() + 1).setSelection(nodeSelection([node.id])));
}

function addLink(): void {
  const href = globalThis.prompt('Link URL', 'https://');
  if (href)
    writekit.command(addMark('link', { href }));
}
</script>

<template>
  <section>
    <h2>Complex blocks</h2>
    <p class="hint">Quote, callout, code block, lists (bulleted / numbered / to-do), image &amp; divider atoms, plus the full mark set. Everything is registry-driven.</p>

    <div class="toolbar wrap">
      <button @mousedown.prevent="writekit.command(toggleMark('bold'))"><b>B</b></button>
      <button @mousedown.prevent="writekit.command(toggleMark('italic'))"><i>I</i></button>
      <button @mousedown.prevent="writekit.command(toggleMark('underline'))"><u>U</u></button>
      <button @mousedown.prevent="writekit.command(toggleMark('strike'))"><s>S</s></button>
      <button @mousedown.prevent="writekit.command(toggleMark('code'))">&lt;/&gt;</button>
      <button @mousedown.prevent="writekit.command(toggleMark('highlight'))">HL</button>
      <button @mousedown.prevent="addLink">Link</button>
      <span class="sep" />
      <button @mousedown.prevent="writekit.command(setBlockType('paragraph'))">P</button>
      <button @mousedown.prevent="writekit.command(setBlockType('heading', { level: 1 }))">H1</button>
      <button @mousedown.prevent="writekit.command(setBlockType('heading', { level: 2 }))">H2</button>
      <button @mousedown.prevent="writekit.command(setBlockType('blockquote'))">Quote</button>
      <button @mousedown.prevent="writekit.command(setBlockType('code-block'))">Code</button>
      <button @mousedown.prevent="writekit.command(setBlockType('callout', { variant: 'info' }))">Callout</button>
      <span class="sep" />
      <button @mousedown.prevent="writekit.command(setBlockType('bulleted-list'))">• List</button>
      <button @mousedown.prevent="writekit.command(setBlockType('numbered-list'))">1. List</button>
      <button @mousedown.prevent="writekit.command(setBlockType('todo-list', { checked: false, indent: 0 }))">☐ Todo</button>
      <button @mousedown.prevent="writekit.command(toggleChecked)">Toggle ✓</button>
      <span class="sep" />
      <button @mousedown.prevent="insertAfterFocus(image('', ''))">+ Image</button>
      <button @mousedown.prevent="insertAfterFocus(divider())">+ Divider</button>
      <span class="sep" />
      <button @mousedown.prevent="writekit.undo()">Undo</button>
      <button @mousedown.prevent="writekit.redo()">Redo</button>
    </div>

    <p class="hint">Type <kbd>/</kbd> to insert a block; select text for the bubble toolbar; hover a block and drag the <span aria-hidden="true">⠿</span> handle to reorder. Markdown shortcuts work too: <kbd># </kbd>, <kbd>- </kbd>, <kbd>&gt; </kbd>, <kbd>1. </kbd>, <kbd>[] </kbd>.</p>
    <WritekitRoot :writekit="writekit" autofocus draggable class="writekit">
      <WritekitContent />
      <WritekitBubbleMenu />
      <WritekitSlashMenu />
    </WritekitRoot>
    <details><summary>document JSON</summary><pre>{{ docJson }}</pre></details>
  </section>
</template>
