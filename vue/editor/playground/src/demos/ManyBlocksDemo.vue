<script setup lang="ts">
import type { Node } from '@editor';
import { EditorRoot } from '@editor';
import { h, makeEditor, p } from '../lib';
import Toolbar from '../Toolbar.vue';

const blocks: Node[] = [];
for (let i = 1; i <= 60; i++) {
  if (i % 10 === 1)
    blocks.push(h(2, `Section ${Math.ceil(i / 10)}`));
  else
    blocks.push(p(`Block ${i}: the quick brown fox jumps over the lazy dog.`));
}

const editor = makeEditor(blocks);
</script>

<template>
  <section>
    <h2>Many blocks</h2>
    <p class="hint">60 blocks — test cross-block drag over a long range, ↑/↓ navigation, and Cmd/Ctrl+A (once = current block, twice = whole document).</p>
    <Toolbar :editor="editor" />
    <EditorRoot :editor="editor" class="editor scroll" />
  </section>
</template>
