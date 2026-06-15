<script setup lang="ts">
import type { Node } from '@writekit';
import { WritekitRoot } from '@writekit';
import { h, makeWritekit, p } from '../lib';
import Toolbar from '../Toolbar.vue';

const blocks: Node[] = [];
for (let i = 1; i <= 60; i++) {
  if (i % 10 === 1)
    blocks.push(h(2, `Section ${Math.ceil(i / 10)}`));
  else
    blocks.push(p(`Block ${i}: the quick brown fox jumps over the lazy dog.`));
}

const writekit = makeWritekit(blocks);
</script>

<template>
  <section>
    <h2>Many blocks</h2>
    <p class="hint">60 blocks — test cross-block drag over a long range, ↑/↓ navigation, and Cmd/Ctrl+A (once = current block, twice = whole document).</p>
    <Toolbar :writekit="writekit" />
    <WritekitRoot :writekit="writekit" class="writekit scroll" />
  </section>
</template>
