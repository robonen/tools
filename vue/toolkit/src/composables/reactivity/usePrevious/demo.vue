<script setup lang="ts">
import { ref } from 'vue';
import { usePrevious } from './index';

const themes = ['Light', 'Dark', 'System', 'Sepia', 'High contrast'];
const selected = ref(themes[0]);
const previous = usePrevious(selected, 'None');

function pick(theme: string) {
  selected.value = theme;
}
</script>

<template>
  <div class="demo-stack max-w-sm">
    <span class="demo-label">usePrevious</span>

    <div class="grid grid-cols-2 gap-3">
      <div class="demo-card p-4">
        <p class="demo-label">Current</p>
        <p class="mt-1 truncate text-2xl font-bold text-fg">{{ selected }}</p>
      </div>
      <div class="rounded-xl border border-border bg-bg-inset p-4">
        <p class="demo-label">Previous</p>
        <p class="mt-1 truncate text-2xl font-bold text-fg-muted">{{ previous }}</p>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <p class="demo-label">Select a theme</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="theme in themes"
          :key="theme"
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition active:scale-[0.98] cursor-pointer"
          :class="theme === selected
            ? 'border-transparent bg-accent text-accent-fg hover:bg-accent-hover'
            : 'border-border bg-bg-elevated text-fg hover:border-border-strong hover:bg-bg-inset'"
          @click="pick(theme)"
        >
          {{ theme }}
        </button>
      </div>
    </div>

    <p class="text-xs text-fg-subtle">
      Seeded with <span class="font-mono text-fg-muted">"None"</span> as the initial previous value until the source first changes.
    </p>
  </div>
</template>
