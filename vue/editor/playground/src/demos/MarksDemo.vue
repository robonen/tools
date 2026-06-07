<script setup lang="ts">
import { EditorRoot } from '@editor';
import { makeEditor, p, t } from '../lib';
import Toolbar from '../Toolbar.vue';

const editor = makeEditor([
  p([t('Adjacent runs: '), t('bold', 'bold'), t(' '), t('italic', 'italic'), t(' '), t('bold+italic', 'bold', 'italic'), t(' plain.')]),
  p([t('boldAtStart', 'bold'), t(' then plain then '), t('boldAtEnd', 'bold')]),
  p('Select part of a word and toggle Cmd/Ctrl+B — the mark splits the run mid-word; toggle again to remove. With a collapsed caret, toggling sets the mark for the next typed character (stored marks).'),
]);
</script>

<template>
  <section>
    <h2>Inline marks</h2>
    <p class="hint">Adjacent / overlapping marks, marks at run boundaries, partial-word toggling, stored marks.</p>
    <Toolbar :editor="editor" />
    <EditorRoot :editor="editor" class="editor" />
  </section>
</template>
