<script setup lang="ts">
import { computed } from 'vue';
import { useTextSelection } from './index';

const { text, ranges, rects } = useTextSelection();

const charCount = computed(() => text.value.length);
const wordCount = computed(() => {
  const trimmed = text.value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
});

const sample = 'Select any part of this paragraph with your cursor. '
  + 'The composable tracks the live selection through Window.getSelection, '
  + 'exposing the selected text, its bounding rectangles, and the underlying '
  + 'Range objects — all fully reactive.';
</script>

<template>
  <div class="demo-stack max-w-md">
    <span class="demo-label">Select some text</span>

    <p class="demo-card select-text p-4 text-sm leading-relaxed text-fg selection:bg-accent selection:text-accent-fg">
      {{ sample }}
    </p>

    <div class="grid grid-cols-3 gap-2">
      <div class="flex flex-col items-center gap-0.5 rounded-lg border border-border bg-bg-inset p-3">
        <span class="demo-stat text-2xl">{{ charCount }}</span>
        <span class="text-xs text-fg-subtle">chars</span>
      </div>
      <div class="flex flex-col items-center gap-0.5 rounded-lg border border-border bg-bg-inset p-3">
        <span class="demo-stat text-2xl">{{ wordCount }}</span>
        <span class="text-xs text-fg-subtle">words</span>
      </div>
      <div class="flex flex-col items-center gap-0.5 rounded-lg border border-border bg-bg-inset p-3">
        <span class="demo-stat text-2xl">{{ ranges.length }}</span>
        <span class="text-xs text-fg-subtle">ranges</span>
      </div>
    </div>

    <div class="rounded-lg border border-border bg-bg-inset p-3">
      <span class="demo-label">Selected text</span>
      <p v-if="text" class="mt-1.5 break-words font-mono text-sm text-accent-text">
        “{{ text }}”
      </p>
      <p v-else class="mt-1.5 font-mono text-sm text-fg-subtle">
        Nothing selected yet.
      </p>
    </div>

    <div v-if="rects.length" class="rounded-lg border border-border bg-bg-inset p-3 font-mono text-xs text-fg-muted tabular-nums">
      first rect · {{ Math.round(rects[0]!.width) }} × {{ Math.round(rects[0]!.height) }} px
    </div>
  </div>
</template>
