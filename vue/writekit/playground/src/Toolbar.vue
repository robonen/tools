<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import type { Writekit } from '@writekit';
import { isBlockActive, isMarkActive, setBlockType, toggleBlockType, toggleMark } from '@writekit';

const { writekit } = defineProps<{ writekit: Writekit }>();

// Re-evaluate active-states on every transaction.
const rev = ref(0);
const bump = (): void => void (rev.value += 1);
writekit.on('transaction', bump);
onBeforeUnmount(() => writekit.off('transaction', bump));

const boldActive = computed(() => (rev.value, isMarkActive(writekit.state, 'bold')));
const italicActive = computed(() => (rev.value, isMarkActive(writekit.state, 'italic')));
const h1Active = computed(() => (rev.value, isBlockActive(writekit.state, 'heading', { level: 1 })));
const h2Active = computed(() => (rev.value, isBlockActive(writekit.state, 'heading', { level: 2 })));
const canUndo = computed(() => (rev.value, writekit.canUndo()));
const canRedo = computed(() => (rev.value, writekit.canRedo()));
</script>

<template>
  <div class="toolbar">
    <button :data-active="boldActive || undefined" @mousedown.prevent="writekit.command(toggleMark('bold'))"><b>B</b></button>
    <button :data-active="italicActive || undefined" @mousedown.prevent="writekit.command(toggleMark('italic'))"><i>I</i></button>
    <span class="sep" />
    <button :data-active="h1Active || undefined" @mousedown.prevent="writekit.command(toggleBlockType('heading', { level: 1 }))">H1</button>
    <button :data-active="h2Active || undefined" @mousedown.prevent="writekit.command(toggleBlockType('heading', { level: 2 }))">H2</button>
    <button @mousedown.prevent="writekit.command(setBlockType('paragraph'))">P</button>
    <span class="sep" />
    <button :disabled="!canUndo" @mousedown.prevent="writekit.undo()">Undo</button>
    <button :disabled="!canRedo" @mousedown.prevent="writekit.redo()">Redo</button>
  </div>
</template>
