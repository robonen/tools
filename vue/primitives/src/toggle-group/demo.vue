<script setup lang="ts">
import { ToggleGroupItem, ToggleGroupRoot } from '@robonen/primitives';
import { ref } from 'vue';

// `type="multiple"` → v-model is a string[] of every pressed value.
const formatting = ref<string[]>(['bold']);

const marks = [
  { value: 'bold', label: 'B', title: 'Bold', class: 'font-bold' },
  { value: 'italic', label: 'I', title: 'Italic', class: 'italic' },
  { value: 'underline', label: 'U', title: 'Underline', class: 'underline' },
];

// `type="single"` → v-model is a single string (empty when nothing is pressed).
const align = ref('left');

const alignments = [
  { value: 'left', title: 'Align left', label: 'L' },
  { value: 'center', title: 'Align center', label: 'C' },
  { value: 'right', title: 'Align right', label: 'R' },
];
</script>

<template>
  <div class="flex flex-col gap-5 p-6 max-w-md bg-(--bg) text-(--fg) border border-(--border) rounded-xl">
    <div class="flex flex-col gap-2">
      <span class="text-xs font-medium text-(--fg-muted)">Text formatting (multiple)</span>
      <ToggleGroupRoot
        v-model="formatting"
        type="multiple"
        class="inline-flex w-fit gap-1 p-1 rounded-lg bg-(--bg-inset) border border-(--border)"
      >
        <ToggleGroupItem
          v-for="m in marks"
          :key="m.value"
          :value="m.value"
          :title="m.title"
          class="grid place-items-center w-8 h-8 rounded-md text-sm select-none outline-none transition-colors text-(--fg-muted) hover:bg-(--bg-subtle) data-[state=on]:bg-(--accent) data-[state=on]:text-(--accent-fg) focus-visible:ring-2 focus-visible:ring-(--ring)"
          :class="m.class"
        >
          {{ m.label }}
        </ToggleGroupItem>
      </ToggleGroupRoot>
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs font-medium text-(--fg-muted)">Alignment (single)</span>
      <ToggleGroupRoot
        v-model="align"
        type="single"
        class="inline-flex w-fit gap-1 p-1 rounded-lg bg-(--bg-inset) border border-(--border)"
      >
        <ToggleGroupItem
          v-for="a in alignments"
          :key="a.value"
          :value="a.value"
          :title="a.title"
          class="grid place-items-center w-8 h-8 rounded-md text-sm font-medium select-none outline-none transition-colors text-(--fg-muted) hover:bg-(--bg-subtle) data-[state=on]:bg-(--accent) data-[state=on]:text-(--accent-fg) focus-visible:ring-2 focus-visible:ring-(--ring)"
        >
          {{ a.label }}
        </ToggleGroupItem>
      </ToggleGroupRoot>
    </div>

    <p
      class="px-3 py-6 rounded-lg bg-(--bg-subtle) border border-(--border) text-sm"
      :class="[
        { 'font-bold': formatting.includes('bold') },
        { 'italic': formatting.includes('italic') },
        { 'underline': formatting.includes('underline') },
        align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left',
      ]"
    >
      The quick brown fox.
    </p>
  </div>
</template>
