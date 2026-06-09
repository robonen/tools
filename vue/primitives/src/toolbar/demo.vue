<script setup lang="ts">
import { ToolbarButton, ToolbarRoot, ToolbarSeparator } from '@robonen/primitives';
import { ref } from 'vue';

// Track which formatting marks are "on" so the toolbar reflects active state.
const marks = ref<Record<string, boolean>>({ bold: true, italic: false });

function toggle(mark: string): void {
  marks.value[mark] = !marks.value[mark];
}

const align = ref('left');
const alignments = [
  { value: 'left', title: 'Align left', icon: 'i-ph-text-align-left' },
  { value: 'center', title: 'Align center', icon: 'i-ph-text-align-center' },
  { value: 'right', title: 'Align right', icon: 'i-ph-text-align-right' },
];
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-3 rounded-xl border border-(--border) bg-(--bg-elevated) p-4 text-(--fg)">
    <ToolbarRoot
      class="flex w-fit items-center gap-1 rounded-lg border border-(--border) bg-(--bg-inset) p-1"
      aria-label="Text formatting"
    >
      <ToolbarButton
        v-for="m in ['bold', 'italic', 'underline']"
        :key="m"
        :title="m.charAt(0).toUpperCase() + m.slice(1)"
        :class="[
          marks[m] ? 'bg-(--accent) text-(--accent-fg)' : 'text-(--fg-muted) hover:bg-(--bg-subtle)',
        ]"
        class="grid h-8 w-8 place-items-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-(--ring)"
        @click="toggle(m)"
      >
        <span
          :class="{
            'i-ph-text-b-bold': m === 'bold',
            'i-ph-text-italic': m === 'italic',
            'i-ph-text-underline': m === 'underline',
          }"
          class="h-4 w-4"
        />
      </ToolbarButton>

      <ToolbarSeparator class="mx-1 h-5 w-px bg-(--border)" />

      <ToolbarButton
        v-for="a in alignments"
        :key="a.value"
        :title="a.title"
        :class="[
          align === a.value ? 'bg-(--accent) text-(--accent-fg)' : 'text-(--fg-muted) hover:bg-(--bg-subtle)',
        ]"
        class="grid h-8 w-8 place-items-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-(--ring)"
        @click="align = a.value"
      >
        <span :class="a.icon" class="h-4 w-4" />
      </ToolbarButton>

      <ToolbarSeparator class="mx-1 h-5 w-px bg-(--border)" />

      <ToolbarButton
        title="Delete"
        disabled
        class="grid h-8 w-8 place-items-center rounded-md text-(--fg-muted) outline-none transition-colors hover:bg-(--bg-subtle) focus-visible:ring-2 focus-visible:ring-(--ring) data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40"
      >
        <span class="i-ph-trash h-4 w-4" />
      </ToolbarButton>
    </ToolbarRoot>

    <p
      class="rounded-lg border border-(--border) bg-(--bg-subtle) px-3 py-4 text-sm"
      :class="[
        { 'font-bold': marks.bold },
        { 'italic': marks.italic },
        { 'underline': marks.underline },
        align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left',
      ]"
    >
      Tab into the toolbar, then use the arrow keys to move between controls.
    </p>
  </div>
</template>
