<script setup lang="ts">
import { EditorRoot } from '@editor';
import { h, makeEditor, p, t } from '../lib';

const editor = makeEditor([
  h(2, 'Read-only'),
  p([t('You can '), t('select', 'bold'), t(' and copy this text, but typing and shortcuts do nothing.')]),
  p('Mouse selection and arrow navigation still work across blocks.'),
]);
</script>

<template>
  <section>
    <h2>Read-only</h2>
    <p class="hint">editable=false — selection/navigation work; edits and shortcuts are blocked.</p>
    <EditorRoot :editor="editor" :editable="false" class="editor" />
  </section>
</template>
