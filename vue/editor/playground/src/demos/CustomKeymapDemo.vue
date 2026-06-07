<script setup lang="ts">
import { EditorRoot, createNode, createTransaction } from '@editor';
import type { Command, Keymap } from '@editor';
import { makeEditor, p } from '../lib';
import Toolbar from '../Toolbar.vue';

const editor = makeEditor([
  p('Press Cmd/Ctrl+Enter to insert an italic note below the current block.'),
  p('The default keymap (Enter, Backspace, Cmd/Ctrl+B, …) still works — user keymaps merge over it.'),
]);

const insertNote: Command = (state, dispatch) => {
  const sel = state.selection;
  if (sel.kind !== 'text')
    return false;

  if (dispatch) {
    const index = state.doc.content.findIndex(block => block.id === sel.focus.blockId);
    const node = createNode('paragraph', { content: [{ text: '— note —', marks: [{ type: 'italic' }] }] });
    dispatch(createTransaction(state).insertBlock(node, index + 1));
  }

  return true;
};

const keymaps: Keymap[] = [{ 'Mod-Enter': insertNote }];
</script>

<template>
  <section>
    <h2>Custom keymap</h2>
    <p class="hint">A user keymap merged over the defaults: Cmd/Ctrl+Enter inserts a note.</p>
    <Toolbar :editor="editor" />
    <EditorRoot :editor="editor" :keymaps="keymaps" class="editor" />
  </section>
</template>
