<script setup lang="ts">
import { EditorRoot } from '@editor';
import { h, makeEditor, p } from '../lib';
import Toolbar from '../Toolbar.vue';

const left = makeEditor([h(2, 'Editor A'), p('Type and select here.')]);
const right = makeEditor([h(2, 'Editor B'), p('This editor is fully independent.')]);
</script>

<template>
  <section>
    <h2>Multiple editors</h2>
    <p class="hint">Two independent editors on one page — selection and editing in one must never affect the other.</p>
    <div class="cols">
      <div>
        <Toolbar :editor="left" />
        <EditorRoot :editor="left" class="editor" />
      </div>
      <div>
        <Toolbar :editor="right" />
        <EditorRoot :editor="right" class="editor" />
      </div>
    </div>
  </section>
</template>
