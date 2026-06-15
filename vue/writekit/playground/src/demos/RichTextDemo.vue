<script setup lang="ts">
import { computed, ref } from 'vue';
import { WritekitBubbleMenu, WritekitContent, WritekitRoot, WritekitSlashMenu } from '@writekit';
import { h, makeWritekit, p, t } from '../lib';
import Toolbar from '../Toolbar.vue';

const writekit = makeWritekit([
  h(1, 'Welcome to the writekit'),
  p([t('This paragraph mixes '), t('bold', 'bold'), t(', '), t('italic', 'italic'), t(', and '), t('both at once', 'bold', 'italic'), t('.')]),
  p('Drag with the mouse across these two paragraphs — the selection spans both, just like Word. Use ↑/↓ to move between blocks and Shift+↑/↓ to extend across them.'),
  p(''),
  h(2, 'Editing'),
  p('Press Enter to split a block. Press Backspace at the very start of a block to merge it into the previous one. Cmd/Ctrl+Z undoes, Cmd/Ctrl+Shift+Z redoes.'),
]);

const rev = ref(0);
writekit.on('transaction', () => (rev.value += 1));
const docJson = computed(() => (rev.value, JSON.stringify(writekit.state.doc, null, 2)));
</script>

<template>
  <section>
    <h2>Rich text</h2>
    <p class="hint">Mixed marks, headings, an empty block (placeholder), cross-block selection &amp; navigation.</p>
    <Toolbar :writekit="writekit" />
    <WritekitRoot :writekit="writekit" autofocus class="writekit">
      <WritekitContent />
      <WritekitBubbleMenu />
      <WritekitSlashMenu />
    </WritekitRoot>
    <details><summary>document JSON</summary><pre>{{ docJson }}</pre></details>
  </section>
</template>
