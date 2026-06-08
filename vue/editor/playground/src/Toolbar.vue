<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import type { Editor } from '@editor';
import { isBlockActive, isMarkActive, setBlockType, toggleBlockType, toggleMark } from '@editor';

const { editor } = defineProps<{ editor: Editor }>();

// Re-evaluate active-states on every transaction.
const rev = ref(0);
const bump = (): void => void (rev.value += 1);
editor.on('transaction', bump);
onBeforeUnmount(() => editor.off('transaction', bump));

const boldActive = computed(() => (rev.value, isMarkActive(editor.state, 'bold')));
const italicActive = computed(() => (rev.value, isMarkActive(editor.state, 'italic')));
const h1Active = computed(() => (rev.value, isBlockActive(editor.state, 'heading', { level: 1 })));
const h2Active = computed(() => (rev.value, isBlockActive(editor.state, 'heading', { level: 2 })));
const canUndo = computed(() => (rev.value, editor.canUndo()));
const canRedo = computed(() => (rev.value, editor.canRedo()));
</script>

<template>
  <div class="toolbar">
    <button :data-active="boldActive || undefined" @mousedown.prevent="editor.command(toggleMark('bold'))"><b>B</b></button>
    <button :data-active="italicActive || undefined" @mousedown.prevent="editor.command(toggleMark('italic'))"><i>I</i></button>
    <span class="sep" />
    <button :data-active="h1Active || undefined" @mousedown.prevent="editor.command(toggleBlockType('heading', { level: 1 }))">H1</button>
    <button :data-active="h2Active || undefined" @mousedown.prevent="editor.command(toggleBlockType('heading', { level: 2 }))">H2</button>
    <button @mousedown.prevent="editor.command(setBlockType('paragraph'))">P</button>
    <span class="sep" />
    <button :disabled="!canUndo" @mousedown.prevent="editor.undo()">Undo</button>
    <button :disabled="!canRedo" @mousedown.prevent="editor.redo()">Redo</button>
  </div>
</template>
